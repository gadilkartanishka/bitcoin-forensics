import geoip2.database
import pandas as pd
city_reader = geoip2.database.Reader("geoip_data/GeoLite2-City.mmdb")
asn_reader = geoip2.database.Reader("geoip_data/GeoLite2-ASN.mmdb")

def enrich_ip(ip):
    try:
       city_resp = city_reader.city(ip)
       asn_resp = asn_reader.asn(ip)
       return {
           "country": city_resp.country.name,
           "asn": f"AS{asn_resp.autonomous_system_number}"
       }
    except Exception:
        return {"country": None, "asn": None}

def enrich_dataframe(df):
       enriched = df["src_ip"].apply(enrich_ip).apply(pd.Series)
       df["geo_country"] = enriched["country"]
       df["asn"] = enriched["asn"]
       return df