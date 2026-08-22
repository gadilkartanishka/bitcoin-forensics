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
    src_enriched = df["src_ip"].apply(enrich_ip).apply(pd.Series)
    dst_enriched = df["dst_ip"].apply(enrich_ip).apply(pd.Series)

    df["src_geo_country"] = src_enriched["country"]
    df["src_asn"] = src_enriched["asn"]
    df["dst_geo_country"] = dst_enriched["country"]
    df["dst_asn"] = dst_enriched["asn"]

    return df