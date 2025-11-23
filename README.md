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
    <img width="986" height="298" alt="npx init" src="https://github.com/user-attachments/assets/b6f57a02-2161-4325-808b-3cf211a78c18" />

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
    <img width="1304" height="209" alt="db_create" src="https://github.com/user-attachments/assets/eb9ea4d8-138d-4a8c-9988-f3f867e6f4b2" />

    ### Edit migration file with query
    <img width="973" height="398" alt="edit migration" src="https://github.com/user-attachments/assets/be1860ea-8270-4ff3-9bef-f654e4c55750" />

- **db_migrate**
    #### Migrate last file pending: 
    ```javascript 
    npm run db_migrate
    ```
    <img width="1307" height="485" alt="db_migrate" src="https://github.com/user-attachments/assets/b9ce14bd-3f29-42d0-9d26-e856e32ead06" />

- **db_migrate_all**  
    #### Migrate all files, Execute first time after initialize repository: 
    ```javascript    
    npm run db_migrate_all
    ```
    <img width="1299" height="367" alt="db_migrate_all" src="https://github.com/user-attachments/assets/bcf22efe-07f6-43ee-8b27-2b6a59983418" />

    -If already exists
    <img width="1302" height="195" alt="db_migrate_all_2" src="https://github.com/user-attachments/assets/2378297b-9177-4272-8c77-0d6289a50302" />

- **db_rollback**
    #### Undo latest migration: 
    ```javascript     
    npm run db_rollback
    ```
    <img width="1303" height="199" alt="db_rollback" src="https://github.com/user-attachments/assets/5c0d6c31-9974-494e-8316-b813dff66ae9" />

- **db_status**
    #### Check migrations integrity: 
    ```javascript     
    npm run db_status
    ```
    <img width="1301" height="461" alt="db_status" src="https://github.com/user-attachments/assets/75e66978-616b-4235-8198-b14e4358a15d" />

- **db_refresh**
    #### Undo and redo all migrations (CAUTION DATA LOSS, It is not recommended to do it ): 
    ```javascript
    npm run db_refresh
    ```
    <img width="1299" height="467" alt="db_refresh" src="https://github.com/user-attachments/assets/040edc76-a0f8-4334-b9e4-a0f180f72b0e" />

- **too You can also UP or DOWN direct migrations**
    - DIRECT MIGRATIONS WILL NOT BE SAVED IN THE "table_migrations_app" TABLE
    
    - example type up:
    ```javascript
    node mysql2-migrations/migrations_config.js run 1763854407404_create_users_table.js up
    ```
    <img width="1296" height="275" alt="direct query" src="https://github.com/user-attachments/assets/8d255639-f331-49e9-94a5-95255a33753f" />

    - example type down:
    ```javascript
    node mysql2-migrations/migrations_config.js run 1763854407404_create_users_table.js down
    ```
    <img width="1345" height="110" alt="direct query down" src="https://github.com/user-attachments/assets/f0d6f34b-fc00-47e8-a35f-a5ec701941f6" />

# 👩‍💻 Add file migrations 

- Add file to migrate:

    ```javascript
    npm run db_create create_users_table 
    ```
 - Go to "migrations" folder and edit file with query(should contain up and down query or only up):
    
    ```javascript
    export default {
        "description":"Create Users Table",
        "up":
            `
            CREATE TABLE users(
                user_id BIGINT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                surname VARCHAR(100) NOT NULL,
                created_at DATETIME(6) NOT NULL,
                updated_at DATETIME(6) NOT NULL,
                PRIMARY KEY (user_id),
                UNIQUE INDEX user_id_UNIQUE (user_id ASC) VISIBLE)
            `
        ,
        "down":"DROP TABLE users"
    }
    ```

# ⚡️ Run migrations

- Finally, run the migration with the command:

```javascript
npm run db_migrate
```

# 🔥 Others

- Help
```javascript
npx mysql2-migrations help
```
