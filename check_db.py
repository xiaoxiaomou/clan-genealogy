import sqlite3
conn = sqlite3.connect('zupu.db')
cur = conn.cursor()
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
for t in tables:
    name = t[0]
    count = cur.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    print(f'{name}: {count} rows')
conn.close()
