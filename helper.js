import mysql from "mysql2/promise"
import colors from "colors"
import { argv, config } from "node:process"
import fs from 'node:fs/promises'
import path from "node:path"
import { pathToFileURL } from "node:url"

const pathRoot =  path.normalize(path.dirname(process.argv[1]))
const relative_path = path.join(pathRoot,"migrations")
let max_count = 9999

let objectConn = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password:'password',
    database: 'test',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
    enableKeepAlive: false,
    keepAliveInitialDelay: 1000
}

let _config = {
    "name_app":"",
    "table":"",
    "migrations_types":[],
    "show_query":false,
    "cb":()=>{}
}

let pool=null

const makeaDir = async()=>{
    const dirs = await fs.opendir(relative_path).catch((err)=>{
        console.error(colors.red("Directory no found!: "),err)
    })
    if(!dirs){
        try {
            console.info(colors.magenta("Making directory.."))
            await fs.mkdir(relative_path,{recursive:true}).catch((err)=>{console.error(err)})
            return {"status":true,"message":"Directory created!"}
        } catch (error) {
            return {"status":false,"error":error}
        }
    }else{
        return {"status":true,"dirs":dirs}
    }
}

const __query = async(config)=>{
    objectConn.host = config.host
    objectConn.user = config.user
    objectConn.database = config.database
    objectConn.password = config.password
    objectConn.port = config.port
    _config = config
    
    if(!pool){
        pool = mysql.createPool(objectConn)
    }

    const makedir = await makeaDir()
    if(!makedir.status){ return makedir }
    const result = await run_query("CREATE TABLE IF NOT EXISTS `" +_config.table+ "` (`timestamp` varchar(254) NOT NULL UNIQUE)")
    if(result.status){ return await handle(result) }
    return result
}

const run_query = async(query)=>{
    const conn = await pool.getConnection().catch((err)=> {return {"error":err}})
    if(conn.error){ return { status:false, ...conn?.error } }
    const result = await conn.query(query).then(([rows,fields])=>{
    return {"status":true,rows,fields}
    })
    .catch((err)=>{ return {"status":false, "error": err} })
    .finally(()=>{ if(conn && conn.release) conn.release()})
    return result
}

const sortFilesNames = (files_names)=>{
    return files_names.sort((a,b)=>{ return (a.timestamp - b.timestamp)}).slice(0,max_count)
}

const execute_query = async (files_names,type)=>{

    const sort_files_names = sortFilesNames(files_names)

    if (sort_files_names.length){
        const file_name = sort_files_names.shift()["file_name"]
        const file = await import(pathToFileURL(path.join(relative_path,file_name)))
        const queries = file.default
        const description = MessageConsoleAction(queries,type,file_name)
        const timestamp_val = file_name.split("_",1)[0]

        if(typeof (queries[type]) == "string"){

            if(!queries[type].length){
                MessageConsoleQueryEmpty(type,description)
                await updateRecords(type,timestamp_val)
                return await execute_query(sort_files_names,type)
            }else{
                const result = await run_query(queries[type])
                if(result.status){
                    await updateRecords(type,timestamp_val)
                    return await execute_query(sort_files_names,type)
                }else{
                    console.error(colors.red(colors.magenta(_config.name_app)+ " Failed Query! "+type.toUpperCase()+", message: "+colors.yellow(result.error.sqlMessage)))
                    return {"status":false,"error":result.error.sqlMessage}
                }
            }

        }else{
            MessageConsoleQueryError(type,description)
            return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!"}
        }
    
    }else{
        console.info(colors.magenta(_config.name_app)+colors.cyan(" Info: ")+colors.yellow(" No more querys "+type.toUpperCase()+" to running! "))
        return {"status":true, "message":"No more querys "+type.toUpperCase()+" to running!"}
    }
}

const updateRecords = async(type,timestamp_val)=>{
    let query = ""
    if(type==="up"){
        query = "INSERT INTO "+_config.table+" (`timestamp`) VALUES ('"+timestamp_val+"')"
    }else if(type==='down'){
        query = "DELETE FROM "+_config.table+" WHERE `timestamp` = '"+timestamp_val+"'"
    }
    return await run_query(query)
}

const validate_file_name = (file_name)=>{
    const _error_message = "Migration file name can contain alphabets, numbers, hyphen or underscore and max 200 characters!"
    if(typeof file_name !== "string" || file_name.length === 0 || file_name.length > 200){
        return {"status":false,"error":_error_message} 
    }
    let patt = new RegExp(/^[0-9a-zA-Z-_]+$/)
    return {"status":patt.test(file_name),"error":_error_message}
}

const readFolder = async()=>{
    const files = await fs.readdir(relative_path,{encoding:"utf-8",recursive:false,whitFilesTypes:false},(err,files)=>{if(err){ throw err }})
    
    const arrayFiles =  files.filter((f)=> f.endsWith(".js") && f.includes("_") ) 
    const timestamps = []
    const arrayFilesItems =  arrayFiles.map((f)=>{ 
        const _timestamp = f.split("_", 1)[0]
        if(_timestamp.length & !isNaN(Number(_timestamp))){
            timestamps.push(_timestamp)
            return {"timestamp": _timestamp, "file_name":f } 
        }
    }) 
    
    return {"timestamps":timestamps,"files":arrayFilesItems}

}

const add_migration = async ()=>{
    const DateString = Date.now()
    const file_name = (DateString+"_"+argv[3]+".js").toString()
    const file_path = path.join(relative_path,file_name)
    const content = "export default "+JSON.stringify({description:"Description of migration: "+DateString,up:"",down:""},null,4)
    try {
        await fs.writeFile(file_path,content,"utf-8")
        return {"status":true,"file_name":file_name}
    } catch(err){
        return {"status":false,"error":err}
    }
}

const up_migration = async()=>{
    const results = await run_query("SELECT timestamp FROM "+_config.table+" ORDER BY timestamp ASC")
    const files_names = []
    
    let timestamps_db = results.rows.map(r => r.timestamp)
    let max_timestamp = ""
    if(results.status && timestamps_db.length > 1){
        max_timestamp = timestamps_db[timestamps_db.length-1]
    }else if(results.status && timestamps_db.length == 1){
        max_timestamp = timestamps_db[0]
    }

    if(max_timestamp == ""){
        console.info({"status":true,"type":"up","error":"No new migrations pending! ","action":"Executig 'npm run db_migrate_all' once command.."})
        max_count = 9999
        return await up_migrations_first_time()
    }

    const { files, timestamps } = await readFolder()
    
    for (let index = 0; index < files.length; index++) {
        const file = files[index]
        if(Number(file.timestamp) > Number(max_timestamp)){
            files_names.push(file)
        }    
    }
    
    if(!files_names.length){
        return {"status":false,"type":"up","error":"No new migrations pending!","message":"To create new mingrations use 'npm run db_create name_example_migration'"}
    }
    
    return await execute_query(files_names,"up")
}

const up_migrations_first_time = async()=>{
    const results  = await run_query("SELECT timestamp FROM " +_config.table)
    const files_names = []
    let timestamps_db = results.rows.map(r => r.timestamp)
    
    const { files, timestamps } = await readFolder()
    
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        
        const indexTimestamp = timestamps_db.indexOf(file.timestamp)
        if(indexTimestamp == -1){
            files_names.push(file)
        }else{
            console.info(colors.red("Warning ")+colors.yellow("Already exist migration for: ")+colors.green(file.file_name))
        }
        
    }
    return await execute_query(files_names,"up")
}

const down_migrations = async()=>{
    const results = await run_query("SELECT timestamp FROM "+_config.table+" ORDER BY timestamp DESC LIMIT " + max_count)
    let files_names = []
    let timestamps_db = results.rows.map((ele)=>{return ele.timestamp})
    if(timestamps_db.length == 0) return {"status":true,"type":"down","message":"No migrations registered!"}
    const { files, timestamps } = await readFolder()
    for (let index = 0; index < timestamps_db.length; index++) {
        const timestamp_db = timestamps_db[index]
        const indexTimestamp = timestamps.indexOf(timestamp_db)
        if(indexTimestamp> -1){
            files_names.push(files[indexTimestamp])
        }else{
            return {"status":false,"type":"down","error":" Migration file "+timestamp_db+" no found!, remove the timestamp from the "+_config.table +" table or recover the file in the migrations folder!"}
        }
    }
    
    return await execute_query(files_names,"down")
}

const run_migration_directly = async()=>{
    const file_name=argv[3]
    const type=argv[4]
    const file_data = await import(pathToFileURL(path.join(relative_path,file_name)))
    const queries = file_data.default
    const description = MessageConsoleAction(queries,type,file_name)
    
    if(typeof (queries[type]) == "string"){

        if(!queries[type].length){
            MessageConsoleQueryEmpty(type,description)
        }else{                
            const result = await run_query(queries[type])
            if(!result.status){
                console.error(colors.red(colors.magenta(_config.name_app)+ " Failed Query! "+type.toUpperCase()+", message: "+colors.yellow(result.error.sqlMessage)))
                return {"status":false,"error":result.error.sqlMessage}
            }else{
                return {"status":true,"message":"Direct query executed successfully!"}
            }
        }

    }else{
        MessageConsoleQueryError(type,description)
        return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!"}
    }

}

const MessageConsoleAction = (queries,type,file_name)=>{
    const description = queries["description"] ?? file_name
    let message_query = " no show "
    if(_config.show_query){ message_query = queries[type] }
    console.info(colors.magenta(_config.name_app)+colors.green(" Dispatch: ")+colors.blue(" Type: " +type.toUpperCase())+colors.green(" Query: ")+colors.cyan(message_query)+colors.green(" Description: ")+colors.cyan(description))
    return description
}

const MessageConsoleQueryEmpty = (type,description)=>{ 
    console.info(colors.magenta(_config.name_app)+colors.red(" Warning: ")+colors.yellow(" Query type "+type.toUpperCase()+" is empty! ")+colors.green(" Description: ")+colors.cyan(description))    
}

const MessageConsoleQueryError = (type,description)=>{
    console.error(colors.magenta(_config.name_app)+colors.red(" Warning: Failed Query! "+type.toUpperCase()+", message: The query should be of text type and contain up and down properties in file to migrate!")+colors.green(" Description: ")+colors.cyan(description))
    console.error(colors.magenta(_config.name_app)+colors.red(" Warning: Fix this file and retry again!"))
}

const get_status = async()=>{
    // obtener listado de migraciones registradas en tabla
    const results = await run_query("SELECT timestamp FROM "+_config.table+" ORDER BY timestamp ASC LIMIT " + max_count)
    let timestamps_db = results.rows.map((ele)=>{return ele.timestamp})
    const { files, timestamps } = await readFolder()
        
    const _status_events = {
        "mig":"migrated",
        "pen":"pending",
        "nff":"file-no-found",
        "eum":"event-up-empty",
        "edm":"event-down-empty",
        "und":"undefined"
    }
    
    console.log(colors.green("Start - Read Warnings Files --------------------------------------------------------- " ))
    
    for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const indexTimestamp = timestamps_db.indexOf(file.timestamp)

        try {
            const _file = await import(pathToFileURL(path.join(relative_path,file.file_name)))
            const {description,up,down} = _file.default
        
            const _warnings = []
            let migrated = indexTimestamp> -1 ? _status_events.mig : _status_events.pen 
            let filename = file.file_name

            if(!up || !up.length){
                _warnings.push(_status_events.eum)
            }

            if(!down || !down.length){
                _warnings.push(_status_events.edm)
            }

            console.log(colors.cyan("Migration :: "+(index+1)+" "))

            if(_warnings.length){
                console.log(colors.cyan("Status: ") + colors.red(migrated.toUpperCase()) + colors.yellow(" Warnings: "+colors.red(_warnings.length)+" "))
            }else{
                console.log(colors.cyan("Status: ") + colors.magenta(migrated.toUpperCase()))
            }

            console.log({"file":filename,"status": migrated,"warnings":_warnings,"description":description ? description : ".."})
        } catch (error) {
            console.log({"file":index+1,"status": _status_events.und,"warning":"Fail to get file!"})
        }
        console.log("\n")
    }
    console.log(colors.green("End - Read Warnings Files --------------------------------------------------------- " ))

    console.log(colors.blue("Start - Read Warnings Registered --------------------------------------------------------- " ))

    for (let index = 0; index < timestamps_db.length; index++) {
        const timestamp_db = timestamps_db[index]
        const _indexTimestampdb = timestamps.indexOf(timestamp_db)
        if(_indexTimestampdb=== -1){
            console.log(colors.blue("Migration"))
            console.log(colors.cyan("Status: ") + colors.red(_status_events.und.toUpperCase())+colors.yellow(" Warning: "+colors.red(" Migration file "+timestamp_db+" no found!, remove the timestamp from the "+_config.table +" table or recover the file in the migrations folder!")))
            console.log({"register":timestamp_db,"status":_status_events.und,"warning":_status_events.nff})
            console.log("\n")
        }

    }

    console.log(colors.blue("End - Read Warnings Registered --------------------------------------------------------- " ))
    console.log(colors.yellow ("Start - Read Warnings Repeated --------------------------------------------------------- " ))
    
    let frecuency = {}
    files.forEach(item => {
        frecuency[item.timestamp] = (frecuency[item.timestamp] || 0) + 1
    })
    const repeated = Object.keys(frecuency).filter(k => frecuency[k] > 1)
    
    for (let index = 0; index < repeated.length; index++) {
        const element = repeated[index]
        console.log( colors.cyan('File repeated: ')+colors.red(element)+colors.yellow(" Warning: "+colors.red(" Migration file "+element+" is repeated!, you should remove the most recent file and redo(npm run db_create name_file_example) the migration file to prevent unexpected errors!")))
    }
    console.log(colors.yellow ("End - Read Warnings Repeated --------------------------------------------------------- " ))
        
    return {"status":true,"migrated":timestamps_db.length,"files":files.length,"repeated":repeated.length}

}

const handle = async()=>{
    if(argv[2] == 'create' && argv.length == 4){
        const validateFileName =  validate_file_name(argv[3])
        if(validateFileName.status){ 
            const result = await add_migration()
            if(result.status){
                console.info(colors.magenta(" >> File Migration: "+colors.cyan(result.file_name)+" Path: "+colors.green(relative_path)+" << "))
                _config.cb(" >> CREATE << ")
            }else{
                _config.cb(" >> CREATE: "+colors.red("Failed! "+result.error)+" << ")
            }
            return result
        } else{
            console.error(colors.red(colors.magenta(_config.name_app)+ validateFileName.error))
            _config.cb(" >> CREATE << ")
            return validateFileName
        }
    }
    if(argv.length == 3){
        
        if(argv[2] == "up"){
            max_count = 1
            const result = await up_migration()
            _config.cb(" >> MIGRATE << ")
            return result
        }
        
        if(argv[2] == "down"){
            max_count = 1
            const result = await down_migrations()
            _config.cb(" >> ROLLBACK << ")
            return result
        }
        
        if(argv[2] == "migrate"){
            const result = await up_migrations_first_time()
            _config.cb(" >> MIGRATE FIRST TIME << ")
            return result
        }
        
        if(argv[2] == "refresh"){
            const resultdown = await down_migrations()
            if(!resultdown.status){
                return resultdown
            }
            const resultup = await up_migrations_first_time()
            if(!resultup.status){
                return resultup
            }
            _config.cb(" >> REFRESH << ")
            return {"down":resultdown,"up":resultup}
        }

        if(argv[2] == "status"){
            const result = await get_status()
            if(!result.status){
                return result
            }
            _config.cb(" >> STATUS << ")
            return result
        }
    }
    if (argv[2] && argv[2] == 'run' && argv.length == 5){
        if(_config.migrations_types.includes(argv[4])){
            const result = await run_migration_directly()
            _config.cb(" >> DIRECT STRING QUERY << ")
            return result
        }else{
            console.error(colors.magenta(_config.name_app)+colors.red(" Failed direct Query: Parameter up or down missed >>"))
            return {"status":false,"error":"Failed direct Query: Parameter up or down missed >>"}
        }
    }
    console.error(colors.magenta(_config.name_app)+colors.red(" Failed command! "))
    return {"status":false,"error":"Invalid command!","message":"Missed or to many parameter?"}
}

export default __query