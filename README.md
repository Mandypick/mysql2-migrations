#  Mysql2 CLI and Batch Migrations :: Type module projects
    
- Create and manage cli and batch migrations with mysql2 from repositories with configuration "TYPE MODULE"

# 📫 Disclaimer

- This package must be used with ESM syntax ("import"/"export"), not CommonJS ("require")
- Set config on package.json "type": "module"

# 🧠 Configuration

- step 1

    - Install dependencies
    - You should install the 'mysql2' dependency in your project first

    ```javascript
    npm i mysql2
    npm i mysql2-migrations
    ```

- step 2

    - Execute script to add files configuration in environment (reminder: add credentials in Migration instance on finalize)
    
    ```javascript
    npx mysql2-migrations init
    ```
    <img width="982" height="288" alt="npx init" src="https://github.com/user-attachments/assets/c75e6312-ba06-4a2e-9111-6754fa458c09" />

- step 3 (Optional: configure the environment yourself)
    
    - 1. Create a folder in the root app with name "mysql2-migrations"
    - 2. Create a "migrations_config.js" file in the "mysql2-migrations" folder with the following configuration (add your db credentials here)
    - Using Migration as a unique instance to cli (operation from console)
    
    ```javascript
    import { MigrationCLI } from 'mysql2-migrations'

    const db_query = new MigrationCLI({
        "host": "127.0.0.1",     // mysql server host
        "port": 3306,            // mysql server port
        "user": "root",          // mysql user with permissions to CREATE/ALTER/DROP
        "password": "password",  // mysql user password
        "database_name": "test_db", // target database name
        "table_migrations_name": "table_migrations_app",  // table used to track executed migrations (min 2, max 60 chars, only letters/numbers/underscore)
        "show_query": false,      // print the SQL being executed for each migration file (useful for debugging)
        "skip_migration_error": true,  // continue running the remaining migration files even if one query fails, this can hide real errors, e.g. migration files with an empty "down" or "up" query
        "show_depuration": true  // log the final result object returned by the CLI command (recommended)
    });
    db_query.start();
    ```

    - 3. Create a "migrations_config_batch.js" file in the "mysql2-migrations" folder with the following configuration (add your db credentials here) 
    - Using MigrationBatch as a reusable instance to node (operation from commonjs file)

    ```javascript
    import { MigrationBatch } from 'mysql2-migrations'

    //Use this instance to execute migrations commands in pipeline sequence
    const db_query = new MigrationBatch({
        host : "127.0.0.1",
        port : 3306,
        user : "root",
        password : "password",
        database : "test_db",
        name_table_migrations : "table_migrations_app",
        show_query : true,
        skip_migration_error : true,
        show_depuration : true
    })

    // export intance to usage from another common library or pipeline sequence
    export default db_query

    //example usage in another function:
    const params1 = {'command':'db_migrate_all','indexMigration':null,'nameFileMigration':null }
    const result1 = await db_query.start(params1).then((result)=>{
        // to do some with result
        // return res.status(200).json({ status: true, message: 'mysql2-migrations migration report', result });
    }).catch((e)=>{ 
        // to do some with error
        // res.status(500).json({message: 'Error to execute mysql2-migrations migration' });
    })
    const params2 = {'command':'db_migrate','indexMigration':null,'nameFileMigration':'example_migration_file.js' }
    const result2 = await db_query.start(params2)
    
    const params3 = {'command':'db_rollback','indexMigration':2,'nameFileMigration':null }
    const result3 = await db_query.start(params3)
    console.log('migration batch command result 2: '+result2)
    console.log('migration batch command result 3: '+result3)

    ```

    - 4. Create a subfolder "migrations" inside the "mysql2-migrations" folder:

        - root_app/
            - mysql2-migrations/
                - migrations_config.js
                - migrations_config_batch.js
                - migrations/

    - 5. Add the script commands to the package.json configuration:

    ```javascript
    "scripts": {
        "db_create": "node mysql2-migrations/migrations_config.js create",           
        "db_refresh": "node mysql2-migrations/migrations_config.js refresh",                
        "db_migrate_all": "node mysql2-migrations/migrations_config.js migrate",   
        "db_migrate": "node mysql2-migrations/migrations_config.js up",                   
        "db_rollback": "node mysql2-migrations/migrations_config.js down",
        "db_status": "node mysql2-migrations/migrations_config.js status"              
    }
    ```

# 🧩 Description of script commands in CLI instance  
    
- **db_create**       
    #### Create file to migrate: 
    ```javascript
    npm run db_create create_users_table
    ```
    ```javascript
    npm run db_create alter_sales_table
    ```
    <img width="1184" height="209" alt="db_create" src="https://github.com/user-attachments/assets/aa860ee4-f0e3-40ac-8a93-685256baed81" />

    ### Edit migration file with query
    <img width="614" height="398" alt="edit migration" src="https://github.com/user-attachments/assets/89561c02-5e1f-4846-9b03-734b191f7ae5" />

    
- **db_migrate**
    #### Migrate last file pending: 
    ```javascript
    npm run db_migrate
    ```
    <img width="767" height="485" alt="db_migrate" src="https://github.com/user-attachments/assets/23336f3a-500c-40af-ae90-243e25df3330" />

    #### Migrate file with index: (check index with "npm run db_status", index starts at 0)
    ```javascript
    npm run db_migrate <index>
    ```
    <img width="930" height="220" alt="db_migrate_index" src="https://github.com/user-attachments/assets/ae28707f-f965-4694-921c-8fd3649967ea" />

- **db_migrate_all**  
    #### Migrate all files pending: 
    ```javascript
    npm run db_migrate_all
    ```
    <img width="753" height="367" alt="db_migrate_all" src="https://github.com/user-attachments/assets/1330168f-44ae-478c-805a-88eea48408da" />

    ### If already exists:
    <img width="750" height="195" alt="db_migrate_all_2" src="https://github.com/user-attachments/assets/3f7904c6-3747-42c0-9e9b-f2c671db6050" />

- **db_rollback**
    #### Undo latest migration: 
    ```javascript
    npm run db_rollback
    ```
    <img width="798" height="199" alt="db_rollback" src="https://github.com/user-attachments/assets/ab2ec33a-02b9-463f-8852-f269c17949e6" />

    #### Undo migration with index: (check index with "npm run db_status", index starts at 0)
    ```javascript
    npm run db_rollback <index>
    ```
    <img width="937" height="209" alt="db_rollback_index" src="https://github.com/user-attachments/assets/ca92bf1f-49f1-4307-a8a4-9b3f3ebbe179" />

- **db_status**
    #### Check migrations integrity, check indexes of pending and executed migrations:
    - The `index` field shown here is 0-based and matches exactly the `<index>` argument used by `db_migrate <index>` and `db_rollback <index>` (no offset is applied).
    ```javascript
    npm run db_status
    ```
    <img width="699" height="461" alt="db_status" src="https://github.com/user-attachments/assets/fd57173b-2b46-4527-9d4d-ae5fa8f6eb40" />

- **db_refresh**
    #### Undo and redo all migrations (CAUTION: DATA LOSS, not recommended): 
    ```javascript
    npm run db_refresh
    ```
    <img width="792" height="467" alt="db_refresh" src="https://github.com/user-attachments/assets/cc2a30be-65f0-42bf-9b4d-08961fb88a92" />

- **You can also run direct UP or DOWN migrations**
    ### DIRECT MIGRATIONS WILL NOT BE SAVED IN THE "table_migrations_app" TABLE
    ### Don't mix direct migrations with stored migrations in the database
    ### Use this function only to execute queries that don't need to be stored in the database and that you are sure will not cause problems in the future.
    ### This file name is just an example (see image); don't use a timestamp, you can use unformatted file names, e.g.: "direct_create_users_table.js"
    ### Example type up:
    ```javascript
    node mysql2-migrations/migrations_config.js run direct_create_users_table.js up
    ```
    <img width="1158" height="275" alt="direct query" src="https://github.com/user-attachments/assets/71332575-8874-4ff0-8766-50f4cb78d374" />

    ### Example type down:
    ```javascript
    node mysql2-migrations/migrations_config.js run direct_create_users_table.js down
    ```
    <img width="1175" height="110" alt="direct query down" src="https://github.com/user-attachments/assets/58d60c16-57d2-4cd2-93c0-5a82ab057a84" />

# 🧩 Description of commands for batch instance (support essentials commands vs cli instance)

- **db_migrate**  
    #### Migrate last files pending: 
    ```javascript
    const params = {'command':'db_migrate','indexMigration':null,'nameFileMigration':null }
    const result= await db_query.start(params)
    console.log('migration batch command result :'+result)
    ```
    <img width="1227" height="359" alt="db_migrate" src="https://github.com/user-attachments/assets/3ac1db64-f087-4795-869d-629fb70ee803" />

    #### Migrate index file: 
    ```javascript
    const params = {'command':'db_migrate','indexMigration': 0,'nameFileMigration':null }
    const result= await db_query.start(params)
    console.log('migration batch command result :'+result)
    ```
    <img width="915" height="410" alt="db_migrate_index" src="https://github.com/user-attachments/assets/97f2758f-df7a-4436-b1c6-70788ba81d78" />

- **db_migrate_all**  
    #### Migrate all files pending: 
    ```javascript
    const params = {'command':'db_migrate_all','indexMigration':null,'nameFileMigration':null }
    const result= await db_query.start(params)
    console.log('migration batch command result :'+result)
    ```
    <img width="896" height="437" alt="db_migrate_all" src="https://github.com/user-attachments/assets/43b5fba7-ea65-4782-934f-be8a712ad01d" />

- **db_rollback**
    #### Undo last migration: 
    ```javascript
    const params = {'command':'db_rollback','indexMigration':null,'nameFileMigration':null }
    const result = await db_query.start(params)
    console.info('migration batch command result: '+result)
    ```
    <img width="879" height="430" alt="db_rollback" src="https://github.com/user-attachments/assets/89616b79-0db2-4497-ada5-cfb7e91246e4" />

    #### Undo migration index: 
    ```javascript
    const params = {'command':'db_rollback','indexMigration':2,'nameFileMigration':null }
    const result = await db_query.start(params)
    console.info('migration batch command result: '+result)
    ```
    <img width="877" height="426" alt="db_rollback_index" src="https://github.com/user-attachments/assets/8d3d25ca-cb79-4beb-8692-edf85cec516c" />

- **db_status**
    #### Check migrations integrity, check indexes of pending and executed migrations:
    - The `index` field shown here is 0-based and matches exactly the `indexMigration` argument used by `db_migrate` and `db_rollback` (no offset is applied).
    ```javascript
    const params = {'command':'db_status','indexMigration':null,'nameFileMigration':null }
    const result = await db_query.start(params)
    console.log('migration batch command result : '+result)
    ```
    <img width="862" height="419" alt="db_status" src="https://github.com/user-attachments/assets/b7056e3b-7aa2-4b71-a692-32c3a3f57e7d" />

- **db_refresh**
    #### Undo and redo all migrations (CAUTION: DATA LOSS, not recommended): 
    ```javascript
    const params = {'command':'db_refresh','indexMigration':null,'nameFileMigration':null }
    const result = await db_query.start(params)
    console.log('migration batch command result: '+result)
    ```
    <img width="914" height="457" alt="db_refresh" src="https://github.com/user-attachments/assets/adae80b4-65c7-445d-9d8c-9d7dbecdf30b" />

- **You can also run direct UP or DOWN migrations**
    ### DIRECT MIGRATIONS WILL NOT BE SAVED IN THE "table_migrations_app" TABLE
    ### Don't mix direct migrations with stored migrations in the database
    ### Use this function only to execute queries that don't need to be stored in the database and that you are sure will not cause problems in the future.
    
    ### Example type up:
    ```javascript
    const params = {'command':'db_migrate','indexMigration':null,'nameFileMigration':'direct_create_users_table.js' }
    const result = await db_query.start(params)
    console.log('migration batch command result: '+result)
    ```
    ### Example type down:
    ```javascript    
    const params = {'command':'db_rollback','indexMigration':null,'nameFileMigration':'direct_create_users_table.js' }
    const result = await db_query.start(params)
    console.log('migration batch command result: '+result)
    ```
# 🔥 Others

- Help
```javascript
npx mysql2-migrations help
```
