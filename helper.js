import colors from "colors"
import fs from 'node:fs/promises'
import path from "node:path"
import { pathToFileURL } from "node:url"

export const enumCoommands = {
    "db_refresh": "refresh",
    "db_migrate_all": "migrate",
    "db_migrate": "up",
    "db_rollback": "down",
    "db_status": "status"
}

const _status_events = {"mig":"MIGRATED","pen":"PENDING","nff":"FILE-NO-FOUND","eum":"EVENT-UP-EMPTY","edm":"EVENT-DOWN-EMPTY","und":"UNDEFINED"}

//ok
function validate_file_name(file_name){
    const _error_message = "Migration file name can contain alphabets, numbers, hyphen or underscore and max 200 characters!"
    if(typeof file_name !== "string" || file_name.length === 0 || file_name.length > 200){
        return {"status":false,"error":_error_message}
    }
    let patt = new RegExp(/^[0-9a-zA-Z-_]+$/)
    return {"status":patt.test(file_name),"error":_error_message}
}
// ok
function validate_file_extension(file_name){
    const _error_message = "Migration file name must have .js extension!"
    if(typeof file_name !== "string" || !file_name.endsWith(".js")){
        return {"status":false,"error":_error_message}
    }
    return {"status":true,"error":null}
}
// OK
async function readFolder (relative_path){
    const files = await fs.readdir(relative_path,{encoding:"utf-8",recursive:false})
    const arrayFiles =  files.filter((f)=> f.endsWith(".js") && f.includes("_") ) 
    const timestamps = []
    const arrayFilesItems =  arrayFiles.map((f,index)=>{ 
        const _timestamp = f.split("_", 1)[0]
        if(_timestamp.length & !isNaN(Number(_timestamp))){
            timestamps.push(Number(_timestamp))
            return {"index": index,"timestamp":Number(_timestamp),"file_name":f } 
        }
    }) 
    return {"timestamps":timestamps,"files":arrayFilesItems}
}
// OK
function map_timestamps_to_number_sort_asc(results){
    return results.rows.map(r => Number(r.timestamp)).filter(Number.isFinite).sort((a,b)=> a-b)
}
// OK
function map_timestamps_to_number_sort_des(results){
    return results.rows.map(r => Number(r.timestamp)).filter(Number.isFinite).sort((a,b)=> b-a)
}
//ok
function get_warnings_registered(timestamps,timestamps_db){
    const _warnings_registered = []
    for (let index = 0; index < timestamps_db.length; index++) {
        const timestamp_db = timestamps_db[index]
        if(!timestamps.includes(timestamp_db)){
            _warnings_registered.push({"register":timestamp_db,"status":_status_events.und,"warning":_status_events.nff})
        }
    }
    return _warnings_registered
}
// OK
function get_warnings_repeat_files(files){
    const _warnings_repeated = []
    let frecuency = {}
    files.forEach(item => {
        frecuency[item.timestamp] = (frecuency[item.timestamp] || 0) + 1
    })
    const repeated = Object.keys(frecuency).filter(k => frecuency[k] > 1)
    for (let index = 0; index < repeated.length; index++) {
        const element = repeated[index]
    _warnings_repeated.push({"file":element,"warning":"Migration file "+element+" is repeated!"})
    }
    return {"_warnings_repeated":_warnings_repeated, "repeated":repeated}
}
// OK
async function makeaDir(relative_path){
    const dirs = await fs.opendir(relative_path).catch((err)=>{ console.error(colors.red("Migrations directory no found! "),err)})
    if(!dirs){
        try {
            console.info(colors.magenta("Making migrations directory.."))
            await fs.mkdir(relative_path,{recursive:true}).catch((err)=>{console.error(err)})
            return {"status":true,"message":"Migrations directory created!"}
        } catch (error) {return {"status":false,"error":error}}
    }else{return {"status":true,"dirs":dirs}}
}
// OK
function validate_table_name (table){ return typeof table === "string" && /^[a-zA-Z0-9_]{2,60}$/.test(table)}
// OK
export class UtilitaryMigrationBatch {
    pool = null;
    command = null;
    indexMigration = null;
    nameFileMigration = null;
    table_migrations_name = null;
    skip_migration_error = null;
    show_depuration = null;
    show_query = null;
    alias_username = null
    general_warnings_batch = []
    migrations_types = []
    
    constructor(InstanceParams,MigrationParams){
        const { pool,alias_username, table_migrations_name, skip_migration_error, show_depuration, show_query, migrations_types} = InstanceParams
        const {command = null,indexMigration = null,nameFileMigration = null} = MigrationParams
        this.pool = pool
        this.command = command
        this.indexMigration = indexMigration
        this.nameFileMigration = nameFileMigration
        this.table_migrations_name = table_migrations_name
        this.skip_migration_error = skip_migration_error
        this.show_depuration = show_depuration
        this.show_query = show_query
        this.alias_username = alias_username
        this.migrations_types = migrations_types
    }

    relative_path_batch = ()=>path.join(process.cwd(),"mysql2-migrations/migrations")

    // OK
    __mainBatch = async()=>{
        if(!validate_table_name(this.table_migrations_name)){ return {"status":false,"error":"Invalid migrations table name!"} }
        const makedir = await makeaDir(this.relative_path_batch())
        if(!makedir.status){ return makedir }
        const result = await this.run_query("CREATE TABLE IF NOT EXISTS `" +this.table_migrations_name+ "` (`timestamp` varchar(254) NOT NULL UNIQUE)")
        const finalResult = result.status ? await this.handleBatch() : result
        return finalResult
    }
    // OK
    run_query = async(query,params=[])=>{    
        const conn = await this.pool.getConnection().catch((err)=> {return {"error":err}})
        if(conn.error){ return { status:false, error: conn.error } }
        const result = await conn.query(query,params).then(([rows,fields])=>{ return {"status":true,rows,fields}})
        .catch((err)=>{ return {"status":false, "error": err} })
        .finally(()=>{ if(conn && conn.release) conn.release()})
        return result
    }
    //OK
    execute_query_batch = async (files_names,type)=>{
        const sort_files_names = [...files_names]
        const warnings_events = []
        while (sort_files_names.length){
            const _file = sort_files_names[0]
            const file_name = sort_files_names.shift()["file_name"]
            const file = await import(pathToFileURL(path.join(this.relative_path_batch(),file_name)))

            const queries = file.default
            const description_migration = this.BuildObjectConsoleAction(queries,type,file_name,_file.index)
            const timestamp = file_name.split("_",1)[0]
            if(typeof (queries[type]) === "string"){
                if(!queries[type].length){
                    warnings_events.push({"file":file_name, "status":true, "warning":"Query type "+type.toUpperCase()+" is empty!","migration":description_migration})
                    await this.updateRecords(type,timestamp)
                    continue
                }else{
                    const result = await this.run_query(queries[type])
                    if(result.status){
                        await this.updateRecords(type,timestamp)
                        warnings_events.push({"file":file_name,"status":true,"message":"Query type "+type.toUpperCase()+" executed successfully!","migration":description_migration})
                        continue
                    }else{
                        warnings_events.push({"file":file_name,"status":false,"warning":"Failed Query! "+type.toUpperCase()+", message: "+result.error.sqlMessage,"migration":description_migration})
                        //  boolean to skip query if error and continue with next migration file, this is for avoid problems with some migration file and continue with the rest of migration files, this function can be used for skip some migration file with some error and continue with the rest of migration files, but this can cause problems if the error is in the query and not in the migration file.
                        if(this.skip_migration_error){
                            await this.updateRecords(type,timestamp)
                            continue
                        }else{
                            return {"status":false,"error":result.error.sqlMessage}
                        }
                    }
                }
            }else{
                return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!", warnings: warnings_events}
            }
        }
        return {"status":true, "message":"No more querys "+type.toUpperCase()+" to running!", "events":warnings_events }
    }
    // OK
    updateRecords = async(type,timestamp)=>{
        let query = ""
        if(type==="up"){ query = "INSERT INTO `"+this.table_migrations_name+"` (`timestamp`) VALUES (?)"}else if(type==='down'){ query = "DELETE FROM `"+this.table_migrations_name+"` WHERE `timestamp` = ?"}
        return await this.run_query(query,[timestamp])
    }
    // OK
    get_timestamps_db = async()=>{
        return await this.run_query("SELECT timestamp FROM "+this.table_migrations_name)
    }
    //ok
    up_migration_batch = async()=>{
        const results = await this.get_timestamps_db()
        const files_names = []

        let timestamps_db = map_timestamps_to_number_sort_asc(results)
        let max_timestamp = 0
        if(results.status && timestamps_db.length > 1){
            max_timestamp = timestamps_db[timestamps_db.length-1]
        }else if(results.status && timestamps_db.length == 1){
            max_timestamp = timestamps_db[0]
        }
        if(max_timestamp == 0){
            this.general_warnings_batch.push({"status":true,"type":"up","error":"No new migrations pending! ","action":"Executig 'db_migrate_all' once function.."})
            return await this.up_migrations_first_time_batch()
        }
        const { files } = await readFolder(this.relative_path_batch())
        for (let index = 0; index < files.length; index++) {
            const file = files[index]
            if(file.timestamp > Number(max_timestamp)){
                files_names.push(file)
            }    
        }
        if(!files_names.length){
            return {"status":false,"type":"up","error":"No new migrations pending!","message":"To create new mingrations use 'npm run db_create name_example_migration' command! - available only in cli mode"}
        }
        return await this.execute_query_batch(files_names,"up")
    }
    //ok
    up_migrations_first_time_batch = async()=>{
        const results  = await this.get_timestamps_db()
        if(!results.status){ return {"status":false,"type":"up","error":results.error} }
        const files_names = []
        let timestamps_db = map_timestamps_to_number_sort_asc(results)
        const { files } = await readFolder(this.relative_path_batch())
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const indexTimestamp_exist = timestamps_db.includes(file.timestamp)
            if(!indexTimestamp_exist){
                files_names.push(file)
            }else{
                this.general_warnings_batch.push({"status":false,"type":"up","error":"Already exist migration for " + file.file_name,"index": index ,"action":"Skipping..."})
            }
        }
        return await this.execute_query_batch(files_names,"up")
    }
    //ok
    down_migrations_batch = async()=>{
        const results = await this.get_timestamps_db()
        if(!results.status){ return {"status":false,"type":"down","error":results.error} }
        let files_names = []
        let timestamps_db = map_timestamps_to_number_sort_des(results).slice(0,this.max_count)
        if(timestamps_db.length == 0) return {"status":false,"type":"down","message":"No migrations registered!"}
        const { files, timestamps } = await readFolder(this.relative_path_batch())
        
        for (let index = 0; index < timestamps_db.length; index++) {
            const timestamp_db = timestamps_db[index]
            const indexTimestamp_exist = timestamps.includes(timestamp_db)
            if(indexTimestamp_exist){
                files_names.push(files[timestamps.indexOf(timestamp_db)])
            }else{
                return {"status":false,"type":"down","warning":"Event type down is empty?","error":"Migration file or event in "+timestamp_db+" no found!, remove the timestamp from the "+this.table_migrations_name+" table, recover the file in the migrations folder, verify the property down in the migration file!"}
            }
        }
        return await this.execute_query_batch(files_names,"down")
    }
    //ok
    up_migration_to_index_batch = async(index)=>{
        const { files, timestamps } = await readFolder(this.relative_path_batch())
        const file = files.find((f)=> f.timestamp == timestamps[index])
        if(file){
            return await this.execute_query_batch([file],"up")
        }
        return {"status":false,"type":"up","error":" Migration file index "+index+" no found!"}
    }
    //ok
    down_migration_to_index_batch = async(index)=>{
        const { files, timestamps } = await readFolder(this.relative_path_batch())
        const file = files.find((f)=> f.timestamp == timestamps[index])
        if(file){
            return await this.execute_query_batch([file],"down")
        }
        return {"status":false,"type":"down","warning":"Event type down is empty?","error":"Migration file or event on index "+index+" no found, verify the property down in the migration file!"}
    }
    //ok
    run_migration_directly_batch = async()=>{
        const file_name = this.nameFileMigration
        const type = enumCoommands[this.command]
        if(validate_file_extension(file_name).status == false){
            return {"status":false,"error":"Migration file "+file_name+" has invalid extension!, use extension .js , check the migrations folder!"}
        }
        let file_data = null
        try{
            file_data = await import(pathToFileURL(path.join(this.relative_path_batch(),file_name)))
        }catch(err){
            return {"status":false,"error":"Migration file "+file_name+" no found!, use extension .js , check the migrations folder!"}
        }
        const queries = file_data.default
        const description = this.BuildObjectConsoleAction(queries,type,file_name)
        
        if(typeof (queries[type]) == "string"){
            if(!queries[type].length){
                return {"status":false,"message":"Direct query executed successfully!","warning":"Query type "+type.toUpperCase()+" is empty!"}
            }else{                
                const result = await this.run_query(queries[type])
                if(!result.status){
                    return {"status":false,"error":result.error.sqlMessage}
                }else{
                    return {"status":true,"message":"Direct query executed successfully!","event":description}
                }
            }
        }else{
            return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!"}
        }
    }
    // ok
    BuildObjectConsoleAction = (queries,type,file_name,index=-1)=>{
        const description = queries["description"] ?? file_name
        let message_query = " no show "
        if(this.show_query){ message_query = queries[type] }
        return {"description":description,"query":message_query,"index":index}
    }
    //ok
    get_status_batch = async()=>{
        const results = await this.get_timestamps_db()
    
        const timestamps_db =  map_timestamps_to_number_sort_asc(results)
        const { files, timestamps } = await readFolder(this.relative_path_batch())

        //⚡️ Start - Read Warnings Files
        const _warnings_events = []
        for (let index = 0; index < files.length; index++) {
            const file = files[index]
            try {
                const _file = await import(pathToFileURL(path.join(this.relative_path_batch(),file.file_name)))
                const {description,up,down} = _file.default
                const _warnings = []
                let migrated = timestamps_db.includes(file.timestamp) ? _status_events.mig : _status_events.pen
                let filename = file.file_name
                if(!up || !up.length){ _warnings.push(_status_events.eum)}
                if(!down || !down.length){_warnings.push(_status_events.edm)}
                _warnings_events.push({"index":index,"file":filename,"status": migrated,"warnings":_warnings,"description":description ? description : ".."})
            } catch (error) {
                _warnings_events.push({"index":index,"status": _status_events.und,"warning":"Fail to get file!"})
            }
        }
        //👍 End - Read Warnings Files"

        //⚡️ Start - Read Warnings Registered"
        const _warnings_registered = get_warnings_registered(timestamps,timestamps_db)
        // 👍 End - Read Warnings Registered"

        //⚡️ Start - Read Warnings Repeated"
        const {_warnings_repeated, repeated} = get_warnings_repeat_files(files)
        //👍 End - Read Warnings Repeated"

        return {"status":true,"migrated":timestamps_db.length,"files":files.length,"repeated":repeated.length, "events": {"warnings_events":_warnings_events,"warnings_registered":_warnings_registered,"warnings_repeated":_warnings_repeated}}
    }
    //ok
    handleBatch = async()=>{
        
        if((this.command && typeof enumCoommands[this.command] === "string" && this.command !== "" && this.command in enumCoommands) && (this.indexMigration === null || typeof this.indexMigration !== "number" || isNaN(this.indexMigration)) && (this.nameFileMigration === null || typeof this.nameFileMigration !== "string" || this.nameFileMigration === "") ){
            
            if(enumCoommands[this.command] == "up"){
                this.max_count = 1
                const result = await this.up_migration_batch()
                result.warnings_events = this.general_warnings_batch
                result.command = ">> MIGRATE - BATCH <<"
                return result
            }
            if(enumCoommands[this.command] == "down"){
                this.max_count = 1
                const result = await this.down_migrations_batch()
                
                result.command = ">> ROLLBACK - BATCH <<"
                return result
            }
            if(enumCoommands[this.command] == "migrate"){
                const result = await this.up_migrations_first_time_batch()
                result.warnings_events = this.general_warnings_batch
                result.command = ">> MIGRATE ALL - BATCH <<"
                return result
            }
            if(enumCoommands[this.command] == "refresh"){
                const resultdown = await this.down_migrations_batch()
                if(!resultdown.status){
                    return resultdown
                }
                const resultup = await this.up_migrations_first_time_batch()
                if(!resultup.status){
                    return resultup
                }
                return {"down":resultdown,"up":resultup, command:">> REFRESH - BATCH <<"}
            }
            if(enumCoommands[this.command] == "status"){
                const result = await this.get_status_batch()
                result.command = ">> STATUS - BATCH <<"
                if(!result.status){
                    return result
                }
                return result
            }
        }

        if((enumCoommands[this.command] == "down" || enumCoommands[this.command] == "up") && (this.indexMigration !== null && typeof this.indexMigration === "number" && this.indexMigration >= 0) && (this.nameFileMigration === null || typeof this.nameFileMigration !== "string" || this.nameFileMigration === "")){
        
            if(enumCoommands[this.command] == "up" && !isNaN(this.indexMigration)){
                const result = await this.up_migration_to_index_batch(Number(this.indexMigration))
                result.command = ">> MIGRATE TO INDEX - BATCH <<"
                return result
            }
            if(enumCoommands[this.command] == "down" && !isNaN(this.indexMigration)){
                const result = await this.down_migration_to_index_batch(Number(this.indexMigration))
                result.command = ">> ROLLBACK TO INDEX - BATCH <<"
                return result
            }
            return {"status":false,"error":"Failed command!","message":"Invalid command! Missed or invalid index parameter, it should be a number!"}
        }
        if((enumCoommands[this.command] == "down" || enumCoommands[this.command] == "up") && (this.nameFileMigration !== null && typeof this.nameFileMigration === "string" && this.nameFileMigration.length > 0) && (this.indexMigration === null || typeof this.indexMigration !== "number" || isNaN(this.indexMigration))){
            if(this.migrations_types.includes(enumCoommands[this.command])){
                const result = await this.run_migration_directly_batch()
                result.command = ">> DIRECT STRING QUERY - BATCH <<"
                return result
            }else{
                return {"status":false,"error":"Failed direct Query: Parameter up or down missed >>"}
            }
        }
        return {"status":false,"error":"Invalid command!","message":"Missed or to many parameter?"}
    }
}
// OK
export class UtilitaryMigrationCLI {
    pool = null;
    table_migrations_name = null;
    skip_migration_error = null;
    show_depuration = null;
    show_query = null;
    alias_username = null
    migrations_types = []
    cb = ()=>{}
    argv = []

    constructor(InstanceParams){
        const { pool,alias_username, table_migrations_name, skip_migration_error, show_depuration, show_query, cb, migrations_types, argv } = InstanceParams
        this.pool = pool
        this.table_migrations_name = table_migrations_name
        this.skip_migration_error = skip_migration_error
        this.show_depuration = show_depuration
        this.show_query = show_query
        this.alias_username = alias_username
        this.cb = cb
        this.migrations_types = migrations_types
        this.argv = argv
    }

    // OK
    relative_path = ()=>path.join(process.cwd(),"mysql2-migrations/migrations")
    max_count = 9999
   
    // OK
    __main = async()=>{
        if(!validate_table_name(this.table_migrations_name)){ return {"status":false,"error":"Invalid migrations table name!"} }
        const makedir = await makeaDir(this.relative_path())
        if(!makedir.status){ return makedir }
        const result = await this.run_query("CREATE TABLE IF NOT EXISTS `" +this.table_migrations_name+ "` (`timestamp` varchar(254) NOT NULL UNIQUE)")
        const finalResult = result.status ? await this.handle() : result
        return finalResult
    }
    // OK
    run_query = async(query,params=[])=>{    
        const conn = await this.pool.getConnection().catch((err)=> {return {"error":err}})
        if(conn.error){ return { status:false, error: conn.error } }
        const result = await conn.query(query,params).then(([rows,fields])=>{ return {"status":true,rows,fields}})
        .catch((err)=>{ return {"status":false, "error": err} })
        .finally(()=>{ if(conn && conn.release) conn.release()})
        return result
    }
    // OK
    execute_query = async (files_names,type)=>{
        const sort_files_names =  [...files_names]
        while (sort_files_names.length){ 
            const _file = sort_files_names[0]
            const file_name = sort_files_names.shift()["file_name"]
            const file = await import(pathToFileURL(path.join(this.relative_path(),file_name)))
            const queries = file.default
            const description_migration = this.MessageConsoleAction(queries,type,file_name,_file.index)
            const timestamp = file_name.split("_",1)[0]
            if(typeof (queries[type]) === "string"){
                if(!queries[type].length){
                    this.MessageConsoleQueryEmpty(type,description_migration)
                    await this.updateRecords(type,timestamp)
                    continue
                }else{
                    const result = await this.run_query(queries[type])
                    if(result.status){
                        await this.updateRecords(type,timestamp)
                        continue
                    }else{
                        console.error(colors.red(colors.magenta(this.alias_username)+ " Failed Query! "+type.toUpperCase()+", message: "+colors.yellow(result.error.sqlMessage)))
                        //  boolean to skip query if error and continue with next migration file, this is for avoid problems with some migration file and continue with the rest of migration files, this function can be used for skip some migration file with some error and continue with the rest of migration files, but this can cause problems if the error is in the query and not in the migration file.
                        if(this.skip_migration_error){
                            await this.updateRecords(type,timestamp)
                            continue
                        }else{
                            return {"status":false,"error":result.error.sqlMessage}
                        }
                    }
                }
            }else{
                MessageConsoleQueryError(type,description_migration)
                return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!"}
            }
        }
        console.info(colors.magenta(this.alias_username)+colors.cyan(" Info: ")+colors.yellow(" No more querys "+type.toUpperCase()+" to running! "))
        return {"status":true, "message":"No more querys "+type.toUpperCase()+" to running!"}
    }
    // OK
    updateRecords = async(type,timestamp)=>{
        let query = ""
        if(type==="up"){ query = "INSERT INTO `"+this.table_migrations_name+"` (`timestamp`) VALUES (?)"}else if(type==='down'){ query = "DELETE FROM `"+this.table_migrations_name+"` WHERE `timestamp` = ?"}
        return await this.run_query(query,[timestamp])
    }
    // OK
    get_timestamps_db = async()=>{
        return await this.run_query("SELECT timestamp FROM "+this.table_migrations_name)
    }
    // OK
    validate_file_name = (file_name)=>{
        const _error_message = "Migration file name can contain alphabets, numbers, hyphen or underscore and max 200 characters!"
        if(typeof file_name !== "string" || file_name.length === 0 || file_name.length > 200){
            return {"status":false,"error":_error_message} 
        }
        let patt = new RegExp(/^[0-9a-zA-Z-_]+$/)
        return {"status":patt.test(file_name),"error":_error_message}
    }
    //ok
    add_migration = async ()=>{
        const DateString = Date.now()
        const file_name = (DateString+"_"+this.argv[3]+".js").toString()
        const file_path = path.join(this.relative_path(),file_name)
        const content = "export default "+JSON.stringify({description:"Description of migration: "+DateString,up:"",down:""},null,4)
        try {
            await fs.writeFile(file_path,content,"utf-8")
            return {"status":true,"file_name":file_name}
        } catch(err){
            return {"status":false,"error":err}
        }
    }
    //ok
    up_migration = async()=>{
        const results = await this.get_timestamps_db()
        const files_names = []
        
        let timestamps_db = map_timestamps_to_number_sort_asc(results)
        let max_timestamp = 0
        if(results.status && timestamps_db.length > 1){
            max_timestamp = timestamps_db[timestamps_db.length-1]
        }else if(results.status && timestamps_db.length == 1){
            max_timestamp = timestamps_db[0]
        }
        if(max_timestamp == 0){
            console.info({"status":true,"type":"up","error":"No new migrations pending! ","action":"Executig 'npm run db_migrate_all' once command.."})
            return await this.up_migrations_first_time()
        }
        const { files } = await readFolder(this.relative_path())
        for (let index = 0; index < files.length; index++) {
            const file = files[index]
            if(file.timestamp > max_timestamp){
                files_names.push(file)
            }    
        }
        if(!files_names.length){
            return {"status":false,"type":"up","error":"No new migrations pending!","message":"To create new mingrations use 'npm run db_create name_example_migration' command! - available only in cli mode"}
        }
        return await this.execute_query(files_names,"up")
    }
    //ok
    up_migrations_first_time = async()=>{
        const results  = await this.get_timestamps_db()
        if(!results.status){ return {"status":false,"type":"up","error":results.error} }
        const files_names = []
        let timestamps_db = map_timestamps_to_number_sort_asc(results)
        const { files } = await readFolder(this.relative_path())
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const indexTimestamp_exist = timestamps_db.includes(file.timestamp)
            if(!indexTimestamp_exist){
                files_names.push(file)
            }else{
                console.info(colors.red("Warning ")+colors.yellow("Already exist migration for ")+colors.cyan("index: "+index+" ")+colors.green(file.file_name))
            }
        }
        return await this.execute_query(files_names,"up")
    }
    //ok
    down_migrations = async()=>{
        const results = await this.get_timestamps_db()
        if(!results.status){ return {"status":false,"type":"down","error":results.error} }
        let files_names = []
        let timestamps_db = map_timestamps_to_number_sort_des(results).slice(0,this.max_count)
        if(timestamps_db.length == 0) return {"status":false,"type":"down","message":"No migrations registered!"}
        const { files, timestamps } = await readFolder(this.relative_path())
        for (let index = 0; index < timestamps_db.length; index++){
            const timestamp_db = timestamps_db[index]
            const indexTimestamp_exist = timestamps.includes(timestamp_db)
            if(indexTimestamp_exist){
                files_names.push(files[timestamps.indexOf(timestamp_db)])    
            }else{
                return {"status":false,"type":"down","warning":"Event type down is empty?","error":"Migration file or event in "+timestamp_db+" no found!, remove the timestamp from the "+this.table_migrations_name +" table, recover the file in the migrations folder, verify the property down in the migration file!"}
            }
        }
        return await this.execute_query(files_names,"down")
    }
    //ok
    up_migration_to_index = async(index)=>{
        const { files, timestamps } = await readFolder(this.relative_path())
        const file = files.find((f)=> Number(f.timestamp) == timestamps[index])
        if(file){
            return await this.execute_query([file],"up")
        }
        return {"status":false,"type":"up","error":" Migration file index "+index+" no found!"}
    }
    //ok
    down_migration_to_index = async(index)=>{
        const { files, timestamps } = await readFolder(this.relative_path())
        const file = files.find((f)=> f.timestamp == timestamps[index])
        if(file){
            return await this.execute_query([file],"down")
        }
        return {"status":false,"type":"down","warning":"Event type down is empty?","error":"Migration file or event on index "+index+" no found, verify the property down in the migration file!"}
    }
    //ok
    run_migration_directly = async()=>{
        const file_name=this.argv[3]
        const type=this.argv[4]
        if(validate_file_extension(file_name).status == false){
            return {"status":false,"error":"Migration file "+file_name+" has invalid extension!, use extension .js , check the migrations folder!"}
        }
        let file_data = null
        try{
            file_data = await import(pathToFileURL(path.join(this.relative_path(),file_name)))
        }catch(err){
            return {"status":false,"error":"Migration file "+file_name+" no found!, use extension .js , check the migrations folder!"}
        }
        
        const queries = file_data.default
        const description = this.MessageConsoleAction(queries,type,file_name)
        
        if(typeof (queries[type]) == "string"){
            if(!queries[type].length){
                this.MessageConsoleQueryEmpty(type,description)
                return {"status":false,"message":"Direct query executed successfully!","warning":"Query type "+type.toUpperCase()+" is empty!"}
            }else{                
                const result = await this.run_query(queries[type])
                if(!result.status){
                    console.error(colors.red(colors.magenta(this.alias_username)+ " Failed Query! "+type.toUpperCase()+", message: "+colors.yellow(result.error.sqlMessage)))
                    return {"status":false,"error":result.error.sqlMessage}
                }else{
                    return {"status":true,"message":"Direct query executed successfully!"}
                }
            }
        }else{
            this.MessageConsoleQueryError(type,description)
            return {"status":false,"error":"Failed Query: "+type.toUpperCase()+", Query type not supported!"}
        }
    }
    // ok
    MessageConsoleAction = (queries,type,file_name,index=-1)=>{
        const description = queries["description"] ?? file_name
        let message_query = " no show "
        if(this.show_query){ message_query = queries[type] }
        console.info(colors.magenta(this.alias_username)+colors.green(" Dispatch: ")+colors.blue(" Type: " +type.toUpperCase())+colors.green(" Query: ")+colors.cyan(message_query)+colors.green(" Index: ")+colors.cyan(index)+colors.green(" Description: ")+colors.cyan(description))
        return description
    }
    //ok
    MessageConsoleQueryEmpty = (type,description)=>{ 
        console.info(colors.magenta(this.alias_username)+colors.red(" Warning: ")+colors.yellow(" Query type "+type.toUpperCase()+" is empty! ")+colors.green(" Description: ")+colors.cyan(description))    
    }
    //ok
    MessageConsoleQueryError = (type,description)=>{
        console.error(colors.magenta(this.alias_username)+colors.red(" Warning: Failed Query! "+type.toUpperCase()+", message: The query should be of text type and contain up and down properties in file to migrate!")+colors.green(" Description: ")+colors.cyan(description))
        console.error(colors.magenta(this.alias_username)+colors.red(" Warning: Fix this file and retry again!"))
    }
    //ok
    get_status = async()=>{
        const results = await this.get_timestamps_db()
        const timestamps_db = map_timestamps_to_number_sort_asc(results)
        const { files, timestamps } = await readFolder(this.relative_path())
        console.log(colors.green("⚡️ Start - Read Warnings Files"))
        for (let index = 0; index < files.length; index++) {
            const file = files[index]
            try {
                const _file = await import(pathToFileURL(path.join(this.relative_path(),file.file_name)))
                const {description,up,down} = _file.default
                const _warnings = []
                let migrated = timestamps_db.includes(file.timestamp) ? _status_events.mig : _status_events.pen
                let filename = file.file_name
                if(!up || !up.length){ _warnings.push(_status_events.eum)}
                if(!down || !down.length){_warnings.push(_status_events.edm)}
                const status_color_event = migrated == _status_events.pen ? colors.magenta(migrated.toUpperCase()) : colors.green(migrated.toUpperCase())
                if(_warnings.length){
                    console.log(colors.cyan("Status: ") + status_color_event + colors.yellow(" Warnings: "+colors.red(_warnings.length)+" "))
                }else{
                    console.log(colors.cyan("Status: ") + status_color_event)
                }
                console.log({"index":index,"file":filename,"status": migrated,"warnings":_warnings,"description":description ? description : ".."})
            } catch (error) {
                console.log({"index":index,"status": _status_events.und,"warning":"Fail to get file!"})
            }
            console.log("\n")
        }
        console.log(colors.green("👍 End - Read Warnings Files"))
        console.log(colors.blue("⚡️ Start - Read Warnings Registered" ))
        for (let index = 0; index < timestamps_db.length; index++) {
            const timestamp_db = timestamps_db[index]
            if(!timestamps.includes(timestamp_db)){
                console.log(colors.blue("Migration"))
                console.log(colors.cyan("Status: ") + colors.red(_status_events.und.toUpperCase())+colors.yellow(" Warning: "+colors.red(" Migration file "+timestamp_db+" no found!, remove the timestamp from the "+this.table_migrations_name +" table or recover the file in the migrations folder!")))
                console.log({"register":timestamp_db,"status":_status_events.und,"warning":_status_events.nff})
                console.log("\n")
            }
        }

        console.log(colors.blue("👍 End - Read Warnings Registered" ))
        console.log(colors.yellow ("⚡️ Start - Read Warnings Repeated" ))
        let frecuency = {}
        files.forEach(item => {
            frecuency[item.timestamp] = (frecuency[item.timestamp] || 0) + 1
        })
        const repeated = Object.keys(frecuency).filter(k => frecuency[k] > 1)
        for (let index = 0; index < repeated.length; index++) {
            const element = repeated[index]
            console.log( colors.cyan('File repeated: ')+colors.red(element)+colors.yellow(" Warning: "+colors.red(" Migration file "+element+" is repeated!, you should remove the most recent file and redo(npm run db_create name_file_example) the migration file to prevent unexpected errors!")))
        }
        console.log(colors.yellow ("👍 End - Read Warnings Repeated" ))
        return {"status":true,"migrated":timestamps_db.length,"files":files.length,"repeated":repeated.length}
    }
    //ok
    handle = async()=>{
        if(this.argv[2] === "create" && this.argv.length == 4){
            const validateFileName =  validate_file_name(this.argv[3])
            if(validateFileName.status){ 
                const result = await this.add_migration()
                if(result.status){
                    console.info(colors.magenta(" >> File Migration: "+colors.cyan(result.file_name)+" Path: "+colors.green(this.relative_path())+" << "))
                    this.cb(" >> CREATE << ")
                }else{
                    this.cb(" >> CREATE: "+colors.red("Failed! "+result.error)+" << ")
                }
                return result
            } else{
                console.error(colors.red(colors.magenta(this.alias_username)+ validateFileName.error))
                this.cb(" >> CREATE << ")
                return validateFileName
            }
        }
        if(this.argv.length == 3){
            
            if(this.argv[2] == "up"){
                this.max_count = 1
                const result = await this.up_migration()
                this.cb(" >> MIGRATE << ")
                return result
            }
            if(this.argv[2] == "down"){
                this.max_count = 1
                const result = await this.down_migrations()
                this.cb(" >> ROLLBACK << ")
                return result
            }
            if(this.argv[2] == "migrate"){
                const result = await this.up_migrations_first_time()
                this.cb(" >> MIGRATE ALL << ")
                return result
            }
            if(this.argv[2] == "refresh"){
                const resultdown = await this.down_migrations()
                if(!resultdown.status){
                    return resultdown
                }
                const resultup = await this.up_migrations_first_time()
                if(!resultup.status){
                    return resultup
                }
                this.cb(" >> REFRESH << ")
                return {"down":resultdown,"up":resultup}
            }
            if(this.argv[2] == "status"){
                const result = await this.get_status()
                if(!result.status){
                    return result
                }
                this.cb(" >> STATUS << ")
                return result
            }
        }
        if((this.argv[2] == "down" || this.argv[2] == "up") && this.argv.length == 4){
            if(this.argv[2] == "up" && !isNaN(this.argv[3])){
                const result = await this.up_migration_to_index(Number(this.argv[3]))
                this.cb(" >> MIGRATE TO INDEX << ")
                return result
            }
            if(this.argv[2] == "down" && !isNaN(this.argv[3])){
                const result = await this.down_migration_to_index(Number(this.argv[3]))
                this.cb(" >> ROLLBACK TO INDEX << ")
                return result
            }
            return {"status":false,"error":"Failed command!","message":"Invalid command! Missed or invalid index parameter, it should be a number!"}
        }
        if(this.argv[2] && this.argv[2] == 'run' && this.argv.length == 5){
            if(this.migrations_types.includes(this.argv[4])){
                const result = await this.run_migration_directly()
                this.cb(" >> DIRECT STRING QUERY << ")
                return result
            }else{
                console.error(colors.magenta(this.alias_username)+colors.red(" Failed direct Query: Parameter up or down missed >>"))
                return {"status":false,"error":"Failed direct Query: Parameter up or down missed >>"}
            }
        }
        console.error(colors.magenta(this.alias_username)+colors.red(" Failed command! "))
        return {"status":false,"error":"Invalid command!","message":"Missed or to many parameter?"}
    }

}