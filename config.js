#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from "node:path"
import { pathToFileURL } from "node:url"
import colors from "colors"
import { argv, config } from "node:process"

const file_name = "migrations_config.js"
const file_name_batch = "migrations_config_batch.js"
const file_package = "package.json"
const pathRoot =  path.normalize(process.cwd())
const relative_path_config = path.join(pathRoot,"mysql2-migrations")
const relative_path_migrations = path.join(relative_path_config,"migrations")
const path_config = path.join(relative_path_config,file_name)
const path_config_batch = path.join(relative_path_config,file_name_batch)
const path_package = path.join(pathRoot,file_package)

const addFileConfig = async()=>{
    const data = 
    "import { MigrationCLI } from 'mysql2-migrations'\n"+
    "\n"+
    "//Use this instance to execute migrations from console only\n"+
    "const db_query = new MigrationCLI({\n"+
    "  host: '127.0.0.1',\n"+
    "  port: 3306,\n"+
    "  user: 'root',\n"+
    "  password: 'password',\n"+
    "  database_name: 'test',\n"+
    "  table_migrations_name: 'table_migrations_app',\n"+
    "  show_query: true,\n"+
    "  skip_migration_error: false,\n"+
    "  show_depuration: true\n"+
    "})\n"+
    "\n"+
    "db_query.start()\n";
    
    try {
        await fs.writeFile(path_config,data,"utf-8")
        return {"status":true,"file_name":file_name}
    } catch(err){
        return {"status":false,"error":err}
    }
}

const addFileConfigBatch = async()=>{
    const data = 
    "import { MigrationBatch } from 'mysql2-migrations'\n"+
    "\n"+
    "//Use this instance to execute migrations commands in pipeline sequence\n"+
    "const db_query = new MigrationBatch({\n"+
    "  host: '127.0.0.1',\n"+
    "  port: 3306,\n"+
    "  user: 'root',\n"+
    "  password: 'password',\n"+
    "  database_name: 'test',\n"+
    "  table_migrations_name: 'table_migrations_app',\n"+
    "  show_query: true,\n"+
    "  skip_migration_error: false,\n"+
    "  show_depuration: true\n"+
    "})\n"+
    "\n"+
    "// export instance to usage from another common library or pipeline sequence \n"+
    "export default db_query\n";
    
    try {
        await fs.writeFile(path_config_batch,data,"utf-8")
        return {"status":true,"file_name":file_name_batch}
    } catch(err){
        return {"status":false,"error":err}
    }
}

const makeaDirConfig = async(_relative_path)=>{
    try {
        await fs.mkdir(_relative_path,{recursive:true}).catch((err)=>{console.error(err)})
        return {"status":true,"message":"Config Directory created!"}
    } catch (error) {
        return {"status":false,"error":error}
    }
}

const addScripstToConfiguration = async()=>{
    const configuration = await fs.readFile(pathToFileURL(path.join(pathRoot,"package.json"),"utf-8"))
    const data = JSON.parse(configuration.toString('utf-8'))
    let scripts = {}
    const new_scripts = {
        "db_create": "node mysql2-migrations/migrations_config.js create",
        "db_refresh": "node mysql2-migrations/migrations_config.js refresh",
        "db_migrate_all": "node mysql2-migrations/migrations_config.js migrate",
        "db_migrate": "node mysql2-migrations/migrations_config.js up",
        "db_rollback": "node mysql2-migrations/migrations_config.js down",
        "db_status": "node mysql2-migrations/migrations_config.js status"
    }
    if(data.scripts){
        scripts = {...data.scripts,...new_scripts}
    }else{
        scripts = new_scripts
    }   
    const newData = JSON.stringify({...data,"scripts":{ ...scripts }},null,2)
    try{
        await fs.writeFile(path_package,newData,"utf-8")
        return {"status":true,"file_name":file_package}
    } catch(err){
        return {"status":false,"error":err}
    }
}

const init = async()=>{
    console.info(colors.magenta("⚡️init mysql2-migrations \n"))    
    console.info(colors.green(" Creating config directory.."))
    const makeaDirResultConfig = await makeaDirConfig(relative_path_config)
    if(makeaDirResultConfig.status){
        console.info(colors.cyan("⚡️Created config directory! OK \n"))
    }else{
        console.error(colors.red(" Error: "+makeaDirResultConfig.error))
    }
    console.info(colors.green(" Creating migrations directory.."))
    const makeaDirResultMigrations = await makeaDirConfig(relative_path_migrations)
    if(makeaDirResultMigrations.status){
        console.info( colors.cyan("⚡️Created migrations directory! OK \n"))
    }else{
        console.error(colors.red(" Error: "+makeaDirResultMigrations.error))
    }
    console.info(colors.green(" Add scripts commands to package.."))
    const addScriptsResult = await addScripstToConfiguration()
    if(addScriptsResult.status){
        console.info(colors.cyan("⚡️Scripts commands added to package.json! OK \n"))
    }else{
        console.error(colors.red(" Error: "+addScriptsResult.error))
    }
    console.info( colors.green(" Creating file config.."))
    if(makeaDirResultConfig.status){
        const resultAddFileConfig = await addFileConfig()
        if(resultAddFileConfig.status){
            console.info(colors.cyan("⚡️Config file created! OK, path: "+colors.blue(path_config)+"\n"))
        } else {
            console.error(colors.red(" Error: "+resultAddFileConfig.error))
        }
    }else{
        console.error(colors.red(" Error:  Config directory not found!"))
    }
    console.info( colors.green(" Creating file(batch) config.."))
    if(makeaDirResultConfig.status){
        const resultAddFileConfigBatch = await addFileConfigBatch()
        if(resultAddFileConfigBatch.status){
            console.info(colors.cyan("⚡️Config file batch created! OK, path: "+colors.blue(path_config_batch)+"\n"))
        } else {
            console.error(colors.red(" Error: "+resultAddFileConfigBatch.error))
        }
    }else{
        console.error(colors.red(" Error:  Config directory not found!"))
    }
    process.exit(0)
}

const help = async()=>{
    let configuration = ""
    let data = {"version":"0.0.0"}
    const frames = ["|", "/", "-", "\\"];
    
    let i = 0;

    const spinner = setInterval(() => {
    process.stdout.write(`\rReading.. ${frames[i++ % frames.length]}`);
    }, 100);

    try{ 
        configuration = await fs.readFile("./node_modules/mysql2-migrations/package.json","utf-8")
        data = JSON.parse(configuration.toString('utf-8'))
        await new Promise(resolve => setTimeout(resolve, 1000));
    }catch(err){
        console.error(colors.red("Error: "+err))
        return {"status":false,"error":err}
    }
    
    clearInterval(spinner);
    process.stdout.write("\r");

    const _help={
        "npx mysql2-migrations init":"Create files and initialize configuration environment(overwrite current configuration)",
        "npx mysql2-migrations help":"Show descriptions commands - help",
        "npm run db_create <name>": "Create file to migrate, use: npm run db_create create_example_table",  
        "npm run db_refresh": "Undo and redo all migrations (CAUTION DATA LOSS)",
        "npm run db_migrate_all": "Migrate all files pending",
        "npm run db_migrate": "Migrate last files pending",
        "npm run db_migrate <index>": "Migrate file with index, use: npm run db_migrate 0 (index starts from 0)",
        "npm run db_rollback": "Undo latest migration",
        "npm run db_rollback <index>": "Undo migration with index, use: npm run db_rollback 0 (index starts from 0)",
        "npm run db_status": "Check migrations integrity, check indexes of pending and executed migrations"
    }
    const _help_batch={
        "db_refresh": "refresh all migrations (CAUTION DATA LOSS)",
        "db_migrate_all": "migrate all migrations pending",
        "db_migrate": "execute last migration pending, up migration with index or direct migration file",
        "db_rollback": "undo latest migration, down migration with index or direct migration file",
        "db_status": "status of migrations integrity, check indexes of pending and executed migrations",
   }

    console.log(colors.cyan("mysql2-migrations v"+data.version))
    console.log(colors.cyan("cli commands (only for MigrationCLI instance)"))
    console.table(_help)
    console.log(colors.cyan("batch commands (only for MigrationBatch instance), please see documentation for usage"))
    console.table(_help_batch)
    console.log(colors.yellow("Commands don't works!, reminder attach commands npm(only) in scripts property package.json file (run 'npx mysql2-migrations init')"))
    console.log(colors.yellow("DB Credentilas must be set in new MigrationCLI() and MigrationBatch() instances (see migrations_config.js and migrations_config_batch.js)"))
    console.log(colors.green("visit: ")+colors.blue("https://www.npmjs.com/package/mysql2-migrations"))
    process.exit(0)
}
const args = {"i":"init","h":"help"}
const handler =()=>{
    if(argv.length === 3 && process.argv[2] === args.i){
        init()
        return
    }
    if(argv.length === 3 && process.argv[2] === args.h){
        help()
        return
    }
    console.log(colors.red("mysql2-migrations : ")+colors.red("Missing parameter?"))
    console.log(colors.green("type: ")+colors.cyan("npx mysql2-migrations help"))
}
handler()
