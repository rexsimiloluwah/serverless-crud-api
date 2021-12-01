'use strict';
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Update the region (for the DynamoDB table)
AWS.config.update({
    'region': 'us-west-2'
})
const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Generates an AWS Lambda Response object
 * @param {number} statusCode 
 * @param {object} body 
 * @returns 
 */
 function buildResponse(statusCode=200, body={}){
  return {
      statusCode: statusCode,
      body: JSON.stringify(
        body,
        null,
        2
      )
  }
}

/**
 * Checks the Health of the Server, Test route.
 * @param {*} event 
 * @returns 
 */
module.exports.health = async (event) => {
  return buildResponse(200, {
    "status": true,
    "message": "Server is Healthy"
  })
};

/**
 * Handler for fetching all projects
 * @param {*} event 
 * @returns 
 */
module.exports.getAllProjects = async (event) => {
  const params = {
      TableName: process.env.PROJECTS_TABLE
    }

  let allProjects=[];
  let items;
  try{
      do{
          items = await dynamodb.scan(params).promise();
          console.log(items);
          if(items.Count > 0){
              items.Items.forEach((item) => allProjects.push(item));
              params.ExclusiveStartKey = items.LastEvaluatedKey;
          }
          
      } while(typeof items.LastEvaluatedKey !== 'undefined')
      
      if(allProjects.length){
          return buildResponse(200, {
              status: true,
              message: `Successfully fetched ${allProjects.length} records.`,
              data: allProjects
          })
      }else{
          return buildResponse(404, {
              status: false,
              message: `No projects found.`,
              data: allProjects
          })
      }
      
  }

  catch(error){
      console.error(`An error occurred: - ${error}`);
  }
}

/**
 * Handler for fetching a single project by ID
 * @param {*} event 
 * @returns 
 */
module.exports.getProjectById = async (event) => {
  const projectId = event.pathParameters.id;
    const params = {
      TableName: process.env.PROJECTS_TABLE,
      Key: {
          'id': projectId
      }
  }

  return await dynamodb.get(params).promise().then((response)=> {
      console.log(response);
      return buildResponse(200, {
          status: true,
          message: "Successfully fetched the project.",
          data: response.Item
      });
  }).catch((error)=>{
      console.error(`An error occurred: - ${error}.`);
      return buildResponse(404, {
        status: true,
        message: "Project not found.",
        error: error
      })
  })
}

/**
 * Create a new project
 * @param {*} event 
 * @returns 
 */
module.exports.createProject = async (event) => {
  const newProject = {
    ...JSON.parse(event.body),
    id: crypto.randomBytes(12).toString('hex'),
    createdAt: new Date().getTime()
  }

  const params = {
    TableName: process.env.PROJECTS_TABLE,
    Item: newProject
  }

  return await dynamodb.put(params).promise().then((response)=>{
    console.log(response);
    return buildResponse(201, {
          status: true,
          message: "Successfully created a new project",
          data: newProject
    });
  }).catch((error)=>{
      console.error(`An error occurred: - ${error}`);
      return buildResponse(400, {
        status: false,
        message: "Project creation failed.",
        error: error
      })
  })
}

/**
 * Update a project
 * @param {*} event 
 * @returns 
 */
module.exports.updateProject = async (event) => {
  const {updateKey, updateValue} = JSON.parse(event.body);
  const projectId = event.pathParameters.id;
  const params = {
    TableName: process.env.PROJECTS_TABLE,
    Key: {
        'id': projectId
    },
    UpdateExpression: `set ${updateKey} = :r`,
    ExpressionAttributeValues: {
        ":r": updateValue
    },
    ReturnValues:"UPDATED_NEW"
  }
  console.log(params);
  return await dynamodb.update(params).promise().then((response)=>{
    console.log(response);
    return buildResponse(200, {
        status: true,
        message: "Successfully updated project.",
        data: response
    })
  }).catch(error=>{
      console.error(`An error occurred: - ${error}`);
      return buildResponse(400, {
        status: false,
        message: "Project update failed.",
        error: error
      })
  })
}

/**
 * Delete a project
 * @param {*} event 
 * @returns 
 */
module.exports.deleteProject = async (event) => {
  const projectId = event.pathParameters.id;
  const params = {
    TableName: process.env.PROJECTS_TABLE,
    Key: {
        'id': projectId
    }
  }

  return await dynamodb.delete(params).promise().then((response)=>{
    return buildResponse(200, {
          status: true,
          message: "Successfully deleted project.",
          data: response
      })
  }).catch(error => {
      console.error(`An error occurred: - ${error}.`);
      return buildResponse(400, {
        status: false,
        message: "Project deletion failed.",
        error: error
      })
  })
}
