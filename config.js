#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from "node:path"
import { pathToFileURL } from "node:url"
import colors from "colors"
import { argv, config } from "node:process"

const file_name = "migrations_config.js"
const file_package = "package.json"
const pathRoot =  path.normalize(process.cwd())
const relative_path_config = path.join(pathRoot,"mysql2-migrations")
const relative_path_migrations = path.join(relative_path_config,"migrations")
const path_config = path.join(relative_path_config,file_name)
const path_package = path.join(pathRoot,file_package)

const addFileConfig = async()=>{
    const data = 
    "import Migration from 'mysql2-migrations'\n"+
    "\n"+
    "const db_query = new Migration()\n"+
    'db_query.database = "test"\n'+
    'db_query.user = "root"\n'+
    'db_query.password = "password"\n'+
    'db_query.host = "127.0.0.1"\n'+
    "db_query.port = 3306\n"+
    'db_query.name_table_migrations = "table_migrations_app"\n'+
    "db_query.show_query = true\n"+
    "db_query.show_depuration = true\n"+
    "db_query.start()\n";
    
    try {
        await fs.writeFile(path_config,data,"utf-8")
        return {"status":true,"file_name":file_name}
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
        scripts = {
            ...data.scripts,
            ...new_scripts
        }
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
            console.info(colors.cyan("⚡️Config file created! OK, path: "+colors.blue(path_config)))
        } else {
            console.error(colors.red(" Error: "+resultAddFileConfig.error))
        }
    }else{
        console.error(colors.red(" Error:  Config directory not found!"))
    }

    process.exit(0)
}

const help = async()=>{

    const configuration = await fs.readFile("./package.json","utf-8")
    const data = JSON.parse(configuration.toString('utf-8'))

    const _help={
        "npx mysql2-migrations init":"Create files and initialize configuration environment(execute once time)",
        "npx mysql2-migrations help":"Show descriptions commands - help",
        "npm run db_create": "Create file to migrate, use: npm run db_create create_users_table",  
        "npm run db_refresh": "Undo and redo all migrations (CAUTION DATA LOSS)",
        "npm run db_migrate_all": "Migrate all files, Execute first time after initialize repository",
        "npm run db_migrate": "Migrate last file pending",
        "npm run db_rollback": "Undo latest migration",
        "npm run db_status": "Check migrations integrity"
    }

    console.log(colors.cyan("mysql2-migrations v"+data.version))
    console.table(_help)
    console.log(colors.yellow("Commands don't works!, reminder attach commands npm(only) in scripts property package.json file (npx mysql2-migrations init)"))
    console.log(colors.yellow("DB Credentilas must be set in new Migration() instance (see migrations_config.js)"))
    console.log(colors.green("visit: ")+colors.blue("https://www.npmjs.com/package/mysql2-migrations"))
    process.exit(0)
}

const args = {
    "i":"init",
    "h":"help"
}

const handler =()=>{
    if(argv.length === 3 && process.argv[2] === args.i){
        init()
        return
    }
    if(argv.length === 3 && process.argv[2] === args.h){
        help()
        return
    }
    console.log(colors.red("mysql2-migrations : ")+colors.red("Missing parameters?"))
    console.log(colors.green("type: ")+colors.cyan("npx mysql2-migrations help"))
}

handler()
