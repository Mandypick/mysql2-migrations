
import colors from "colors"
import mysql from "mysql2/promise"
import { UtilitaryMigrationBatch, UtilitaryMigrationCLI } from "./helper.js"
import os from "os"
import { argv, config } from "node:process"

export class MigrationBatch {
    #pool = null;
    #show_query = null;
    #skip_migration_error = null;
    #show_depuration = null;
    #table_migrations_name = null;
    alias_username = os.hostname() || os.userInfo().username || "Sabueso";

    constructor({host,port,user,password,database_name,table_migrations_name,show_query = true,skip_migration_error = true,show_depuration = true}){
        this.#table_migrations_name = table_migrations_name;
        this.#show_query = show_query;
        this.#skip_migration_error = skip_migration_error;
        this.#show_depuration = show_depuration;
        this.createPool(host,port,user,password,database_name)
    }

    createPool = (host,port,user,password,database_name)=>{
        const objectConn = {
            "host":host,
            "port":port,
            "user":user,
            "password":password,
            "database":database_name,
            "waitForConnections":true,
            "connectionLimit":100,
            "queueLimit":0,
            "enableKeepAlive":true,
            "keepAliveInitialDelay":1000
        }
        if(!this.#pool){this.#pool = mysql.createPool(objectConn)}
    }

    closePool =()=>{
        if(this.#pool){
            this.#pool.end().catch((e)=>{
                console.log(colors.red("Error to close mysql2 PoolConnection:",e))
            }).then().finally(()=>{
                console.info(colors.cyan("mysql2-migrations batch log: PoolConnection mysql2 closed!"))
            })
        }
    }
    /**
     * 
     * @param { Object } MigrationParams
     * @param { String } MigrationParams.command - Command to execute (db_migrate_all, db_migrate, db_rollback, db_refresh, db_status)
     * @param { Number } MigrationParams.indexMigration - Index of the migration to execute (optional)
     * @param { String } MigrationParams.nameFileMigration - Name of the migration file to execute (optional) 
     * @returns { Object } { status, warnings_events } - Result of the migration command execution
     * 
     * @example
     * const params1 = {'command':'db_migrate_all','indexMigration':null,'nameFileMigration':null }
     * const params2 = {'command':'db_migrate','indexMigration':null,'nameFileMigration':'example_migration_file.js' }
     * const params3 = {'command':'db_rollback','indexMigration':2,'nameFileMigration':null }
     * const result1 = await db_query.start(params1)
     * const result2 = await db_query.start(params2)
     * const result3 = await db_query.start(params3)
     * console.log('migration batch command result 1: '+result1)
     * console.log('migration batch command result 2: '+result2)
     * console.log('migration batch command result 3: '+result3)
     * use the closePool() method to close the mysql2 pool connection after executing the migration commands sequentially
     */
    start= async (MigrationParams)=>{
        const InstanceParams = {
            "pool":this.#pool,
            "alias_username":this.alias_username,
            "table_migrations_name":this.#table_migrations_name,
            "show_depuration":this.#show_depuration,
            "skip_migration_error":this.#skip_migration_error,
            "show_query":this.#show_query,
            "migrations_types":["up","down"]
        }
        const instanceMigratioBatch = new UtilitaryMigrationBatch(InstanceParams,MigrationParams)
        const result = await instanceMigratioBatch.__mainBatch();
        if( typeof this.#show_depuration === "boolean" && this.#show_depuration){console.info(colors.cyan("mysql2-migrations batch log: "),result)}
        return result
    }

}

export class MigrationCLI {
    #pool = null;
    #show_query = null;
    #skip_migration_error = null;
    #show_depuration = null;
    #table_migrations_name = null;
    alias_username = os.hostname() || os.userInfo().username || "Sabueso";
    cb = (messageEvent="")=>{ console.info(colors.cyan(colors.magenta(this.alias_username)+" Command "+colors.magenta(messageEvent)+" Finished! "))};

    constructor({host,port,user,password,database_name,table_migrations_name,show_query = true,skip_migration_error = true,show_depuration = true}){
        this.#table_migrations_name = table_migrations_name;
        this.#show_query = show_query;
        this.#skip_migration_error = skip_migration_error;
        this.#show_depuration = show_depuration;
        this.createPool(host,port,user,password,database_name)
    }

    createPool = (host,port,user,password,database_name)=>{
        const objectConn = {
            "host":host,
            "port":port,
            "user":user,
            "password":password,
            "database":database_name,
            "waitForConnections":true,
            "connectionLimit":100,
            "queueLimit":0,
            "enableKeepAlive":false,
            "keepAliveInitialDelay":1000
        }
        if(!this.#pool){this.#pool = mysql.createPool(objectConn)}
    }
    /**
     * this method executes the migration command based on the provided parameters in console and returns the result of the execution. See the documentation for more details on the available commands and their usage.
     * @returns void - result of the migration command execution show in console if "show_depuration" is set to true
     * 
     */
    start= async()=>{
        const InstanceParams = {
            "pool":this.#pool,
            "alias_username":this.alias_username,
            "table_migrations_name":this.#table_migrations_name,
            "show_depuration":this.#show_depuration,
            "skip_migration_error":this.#skip_migration_error,
            "show_query":this.#show_query,
            "migrations_types":["up","down"],
            "cb":this.cb,
            "argv":argv
        }
        const instanceMigration = new UtilitaryMigrationCLI(InstanceParams)
        const result = await instanceMigration.__main();
        if( typeof this.#show_depuration === "boolean" && this.#show_depuration){console.info(colors.cyan("mysql2-migrations log: "),result)}
        await this.#pool.end().catch((e)=>{
            console.log(colors.red("Error to close mysql2 PoolConnection:",e))
        }).then().finally(()=>{
            console.info(colors.cyan("mysql2-migrations log: "+colors.magenta("PoolConnection mysql2 closed!")))
        })
        process.exit(0)
    }
}