# PgBouncer Configuration

PgBouncer is a lightweight connection pooler for PostgreSQL that helps manage database connections efficiently.

## What is Transaction Pooling?

Transaction pooling mode (`pool_mode = transaction`) means that a server connection is assigned to a client only for the duration of a transaction. When the transaction is complete, the connection is returned to the pool.

**Benefits:**
- Handles thousands of client connections with only a few dozen server connections
- Prevents "too many clients" errors
- Reduces connection overhead
- Ideal for microservices architecture

## Configuration

### pgbouncer.ini
Main configuration file with the following key settings:
- `pool_mode = transaction` - Use transaction-level pooling
- `max_client_conn = 1000` - Maximum client connections allowed
- `default_pool_size = 25` - Default number of server connections per database
- `reserve_pool_size = 5` - Additional connections for reserve

### userlist.txt
Contains PostgreSQL users and their passwords in MD5 format.

Password hash generated with:
```bash
echo -n "passwordpostgres" | md5sum | awk '{print "md5"$1}'
```

## Connection Details

**From host machine:**
- Connect to: `localhost:5432` (actually connects to PgBouncer)
- PgBouncer proxies to: `postgres:5432`

**From Docker containers:**
- Can connect directly to PostgreSQL: `postgres:5432` (internal only)
- Or through PgBouncer: `pgbouncer:6432`

For production, all services should connect through PgBouncer on port 6432.

## Monitoring

Access PgBouncer admin console:
```bash
psql -h localhost -p 5432 -U postgres pgbouncer
```

Useful commands:
```sql
SHOW POOLS;      -- View connection pools
SHOW CLIENTS;    -- View client connections
SHOW SERVERS;    -- View server connections
SHOW STATS;      -- View statistics
```

## Troubleshooting

If you see authentication errors, verify:
1. Password hash in `userlist.txt` matches PostgreSQL password
2. `auth_type = md5` is set in `pgbouncer.ini`
3. PostgreSQL accepts connections from PgBouncer container
