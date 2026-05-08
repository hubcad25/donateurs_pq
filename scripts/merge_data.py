import json
import pandas as pd
import os

def merge_data():
    print("Merging data...")
    
    # Load processed data
    # Use fillna(0) to avoid NaN values in JSON which break browser JSON.parse()
    donations_df = pd.read_csv('data/processed/donations_rta.csv').fillna(0)
    census_df = pd.read_csv('data/processed/census_2021_rta.csv').fillna(0)
    
    # Load geometry
    with open('data/processed/rta_geometries.json', 'r') as f:
        topojson = json.load(f)
    
    # Create a lookup dictionary from dataframes
    # We use GEO_NAME/RTA as key
    donations_dict = donations_df.set_index('RTA').to_dict(orient='index')
    census_dict = census_df.set_index('GEO_NAME').to_dict(orient='index')
    
    # Inject data into TopoJSON objects
    object_name = list(topojson['objects'].keys())[0]
    geometries = topojson['objects'][object_name]['geometries']
    
    for geom in geometries:
        rta = geom['properties'].get('CFSAUID')
        if not rta:
            continue
            
        # Initialize properties with existing ones
        props = geom['properties']
        
        # Add donation data
        if rta in donations_dict:
            props.update(donations_dict[rta])
        else:
            # Default values if no donations found
            props.update({'Somme': 0, 'Nombre de donateurs': 0, 'Moyenne': 0})
            
        # Add census data
        if rta in census_dict:
            props.update(census_dict[rta])
            
    # Save the final merged TopoJSON to the web folder
    os.makedirs('web/public/data', exist_ok=True)
    output_path = 'web/public/data/map_data.topojson'
    
    with open(output_path, 'w') as f:
        # allow_nan=False ensures we catch any remaining NaNs at dump time
        json.dump(topojson, f)
        
    print(f"Success! Merged data saved to {output_path}")

if __name__ == "__main__":
    merge_data()
