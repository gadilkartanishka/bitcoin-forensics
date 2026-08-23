import csv, json, random
from datetime import datetime, timedelta

random.seed(42)

def random_wallet():
    return "1" + "".join(random.choices("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789", k=25))

def random_ip():
    return f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"

rows = []
base_time = datetime(2024, 1, 1)
for i in range(200):
    num_inputs = random.randint(1, 3)
    num_outputs = random.randint(1, 3)

    rows.append({
        "timestamp": (base_time + timedelta(minutes=i*7)).strftime("%Y-%m-%d %H:%M:%S"),
        "src_ip": random_ip(),
        "dst_ip": random_ip(),
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([8333, 8332, 18333]),
        "txid": f"tx{i:05d}",
        "input_addresses": [random_wallet() for _ in range(num_inputs)],
        "output_addresses": [random_wallet() for _ in range(num_outputs)],
        "input_amounts": [round(random.uniform(0.001, 5), 6) for _ in range(num_inputs)],
        "output_amounts": [round(random.uniform(0.001, 5), 6) for _ in range(num_outputs)],
        "fee": round(random.uniform(0.00001, 0.0005), 8),
        "script_type": random.choice(["P2PKH", "P2SH", "P2WPKH", "P2WSH"]),
    })

# CSV version (flatten lists to pipe-separated strings, common real-world quirk)
with open("raw/sample.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["timestamp","src_ip","dst_ip","src_port","dst_port","txid",
                      "input_addresses","output_addresses","input_amounts","output_amounts",
                      "fee","script_type"])
    for r in rows[:70]:
        writer.writerow([
            r["timestamp"], r["src_ip"], r["dst_ip"], r["src_port"], r["dst_port"], r["txid"],
            "|".join(r["input_addresses"]), "|".join(r["output_addresses"]),
            "|".join(map(str, r["input_amounts"])), "|".join(map(str, r["output_amounts"])),
            r["fee"], r["script_type"]
        ])

# JSON version
with open("raw/sample.json", "w") as f:
    json.dump(rows[70:140], f, indent=2)

# XML version
import xml.etree.ElementTree as ET
root = ET.Element("transactions")
for r in rows[140:200]:
    tx = ET.SubElement(root, "transaction")
    for k, v in r.items():
        el = ET.SubElement(tx, k)
        el.text = "|".join(map(str, v)) if isinstance(v, list) else str(v)
tree = ET.ElementTree(root)
tree.write("raw/sample.xml")

print("Sample CSV, JSON, XML files created in /raw")