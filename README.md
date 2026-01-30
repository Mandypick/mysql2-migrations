#  Mysql2 Migrations :: Type module projects
    
- Create and manager migrations with mysql2 from repositories with configuration "TYPE MODULE"

# 📫 Disclaimer

- This package must be used with MODULE TYPE IMPORT AND FROM
- Set config on package.json "type": "module"
- NO compatible with MODULE.EXPORT AND REQUIRE

# 🧠 Configuration

- step 1

    - Install dependencies
    - Should install 'mysql2' dependency in your projects first

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

- step 3 (Optional configure environment yourself)
    
    - 1.Create a folder in root app with name "mysql2-migrations"
    - 2.Create a "migrations_config.js" file in "mysql2-migrations" folder with next configuration(add your db credentials here)

    ```javascript
    import Migration from 'mysql2-migrations'
    
    const db_query = new Migration()
    db_query.database = "test"
    db_query.user = "root"
    db_query.password = "password"
    db_query.host = "127.0.0.1"
    db_query.port = 3306
    db_query.name_table_migrations = "table_migrations_app" // two characters minimum
    db_query.show_query = true
    db_query.show_depuration = true // show depuration on finalize migration, recommended
    db_query.start()
    ```

    - 3.Create a subfolder "migrations" into "mysql2-migrations" folder:

        - root_app/
            - mysql2-migrations/
                - migrations_config.js
                - migrations/

    - 4.Add scripts commands to package.json configuration:

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

# 👋 Description script commnads
    
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

- **db_migrate_all**  
    #### Migrate all files, Execute first time after initialize repository: 
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

- **db_status**
    #### Check migrations integrity: 
    ```javascript     
    npm run db_status
    ```
    <img width="699" height="461" alt="db_status" src="https://github.com/user-attachments/assets/fd57173b-2b46-4527-9d4d-ae5fa8f6eb40" />

- **db_refresh**
    #### Undo and redo all migrations (CAUTION DATA LOSS, It is not recommended to do it ): 
    ```javascript
    npm run db_refresh
    ```
    <img width="792" height="467" alt="db_refresh" src="https://github.com/user-attachments/assets/cc2a30be-65f0-42bf-9b4d-08961fb88a92" />

- **too You can also UP or DOWN direct migrations**
    ### DIRECT MIGRATIONS WILL NOT BE SAVED IN THE "table_migrations_app" TABLE
    
    ### Example type up:
    ```javascript
    node mysql2-migrations/migrations_config.js run 1763854407404_create_users_table.js up
    ```
    <img width="1158" height="275" alt="direct query" src="https://github.com/user-attachments/assets/71332575-8874-4ff0-8766-50f4cb78d374" />

    ### Example type down:
    ```javascript
    node mysql2-migrations/migrations_config.js run 1763854407404_create_users_table.js down
    ```
    <img width="1175" height="110" alt="direct query down" src="https://github.com/user-attachments/assets/58d60c16-57d2-4cd2-93c0-5a82ab057a84" />

# 🔥 Others

- Help
```javascript
npx mysql2-migrations help
```
