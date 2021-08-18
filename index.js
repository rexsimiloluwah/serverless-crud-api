const AWS = require('aws-sdk');
const crypto = require('crypto');

// Update the region (for the DynamoDB table)
AWS.config.update({
    'region': 'us-west-2'
})

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'project-ideas';
const healthResource = '/health';
const projectResource = '/project';
const projectsResource = '/projects';

exports.handler = async function(event){
    console.log('Request event: -', event);
    let response;
    switch(true){
        case event.httpMethod == 'GET' && event.path === healthResource:
            response = buildResponse(200);
            break;

        case event.httpMethod == 'GET' && event.path === projectsResource:
            response = await getAllProjects();
            break;

        case event.httpMethod == 'GET' && event.path === projectResource:
            response = await getProject(event.queryStringParameters.projectId);
            break;

        case event.httpMethod == 'POST' && event.path === projectResource:
            const reqBody = JSON.parse(event.body)
            let body = {
                ...reqBody,
                projectId: crypto.randomBytes(12).toString('hex'),
                createdAt: new Date().getTime()
            }
            response = await createProject(body);
            break;

        case event.httpMethod == 'PUT' && event.path === projectResource:
            const {updateKey, updateValue} = JSON.parse(event.body);
            response = await updateProject(event.queryStringParameters.projectId, updateKey, updateValue);
            break

        case event.httpMethod == 'DELETE' && event.path === projectResource:
            response = await deleteProject(event.queryStringParameters.projectId);
            break;

        default:
            response = buildResponse(404);
            break;
    }
    
    return response;
}

/**
 * Generates an AWS Lambda Response object
 * @param {number} statusCode 
 * @param {object} body 
 * @returns 
 */
function buildResponse(statusCode, body={}){
    return {
        statusCode: statusCode,
        body: JSON.stringify(body)
    }
}

/**
 * Fetches a project item from the DynamoDB table
 * @param {string} projectId 
 * @returns {Promise} 
 */
async function getProject(projectId){
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'projectId': projectId
        }
    }

    return await dynamodb.get(params).promise().then((response)=> {
        return buildResponse(200, {
            status: true,
            message: "Successfully fetched the project",
            data: response.Item
        });
    }).catch((error)=>{
        console.error(`An error occurred: - ${error}`);
    })
}

/**
 * Creates a new project item in the DynamoDB table
 * @param {object} body 
 * @returns {Promise}
 */
async function createProject(body){
    const params = {
        TableName: dynamodbTableName,
        Item: body
    }

    return await dynamodb.put(params).promise().then((response)=>{
        return buildResponse(201, {
            status: true,
            message: "Successfully created a new project",
            data: body
        });
    }).catch((error)=>{
        console.error(`An error occurred: - ${error}`);
    })
}

/**
 * Updates an exisiting project item in the DynamoDB table
 * @param {string} projectId 
 * @param {string} updateKey 
 * @param {any} updateValue 
 * @returns {Promise}
 */
async function updateProject(projectId, updateKey, updateValue){

    const params = {
        TableName: dynamodbTableName,
        Key: {
            'projectId': projectId
        },
        UpdateExpression: `set ${updateKey} = :r`,
        ExpressionAttributeValues: {
            ":r": updateValue
        },
        ReturnValues:"UPDATED_NEW"
    }

    return await dynamodb.update(params).promise().then((response)=>{
        return buildResponse(200, {
            status: true,
            message: "Successfully updated.",
            data: response
        })
    }).catch(error=>{
        console.error(`An error occurred: - ${error}`);
    })
}

/**
 * Deletes an existing project item from the DynamoDB table
 * @param {string} projectId 
 * @returns {Promise}
 */
async function deleteProject(projectId){
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'projectId': projectId
        }
    }

    return await dynamodb.delete(params).promise().then((response)=>{
        return buildResponse(200, {
            status: true,
            message: "Successfully deleted.",
            data: response
        })
    }).catch(error => {
        console.error(`An error occurred: - ${error}.`);
    })
}

/**
 * Fetches all the project items in the DynamoDB table
 * @returns {object}
 */
async function getAllProjects(){
    const params = {
        TableName: dynamodbTableName
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
            return buildResponse(200, {
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