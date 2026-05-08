import json
import pandas as pd
import os

def merge_data():
    print("Merging data...")
    
    # Load processed data
    donations_df = pd.read_csv('data/processed/donations_rta_yearly.csv').fillna(0)
    census_df = pd.read_csv('data/processed/census_2021_rta.csv').fillna(0)
    
    # Create yearly lookup
    # Structure: { RTA: { Year: { Somme, Nombre de donateurs } } }
    donations_yearly = {}
    for _, row in donations_df.iterrows():
        rta = row['RTA']
        year = str(int(row['Year']))
        if rta not in donations_yearly:
            donations_yearly[rta] = {}
        donations_yearly[rta][year] = {
            'Somme': float(row['Somme']),
            'Nombre de donateurs': int(row['Nombre de donateurs'])
        }
    
    # Total lookup for legacy support and default view
    donations_total = donations_df.groupby('RTA')[['Somme', 'Nombre de donateurs']].sum().to_dict(orient='index')
    
    census_dict = census_df.set_index('GEO_NAME').to_dict(orient='index')
    
    # Load geometry
    with open('data/processed/rta_geometries.json', 'r') as f:
        topojson = json.load(f)
    
    # Inject data into TopoJSON objects
    object_name = list(topojson['objects'].keys())[0]
    geometries = topojson['objects'][object_name]['geometries']
    
    for geom in geometries:
        rta = geom['properties'].get('CFSAUID')
        if not rta:
            continue
            
        props = geom['properties']
        
        # Add yearly donation data
        if rta in donations_yearly:
            props['donations_yearly'] = donations_yearly[rta]
        else:
            props['donations_yearly'] = {}
            
        # Add total donation data
        if rta in donations_total:
            props.update(donations_total[rta])
        else:
            props.update({'Somme': 0, 'Nombre de donateurs': 0})
            
        # Add census data
        if rta in census_dict:
            props.update(census_dict[rta])
            
    # Save the final merged TopoJSON
    os.makedirs('web/public/data', exist_ok=True)
    output_path = 'web/public/data/map_data.topojson'
    
    with open(output_path, 'w') as f:
        json.dump(topojson, f)
        
    print(f"Success! Merged data saved to {output_path}")

if __name__ == "__main__":
    merge_data()
