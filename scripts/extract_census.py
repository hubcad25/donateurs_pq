import requests
import zipfile
import io
import pandas as pd
import os

def download_data(url):
    print(f"Downloading from {url}...")
    response = requests.get(url)
    if response.status_code == 200:
        return zipfile.ZipFile(io.BytesIO(response.content))
    else:
        raise Exception(f"Failed to download: {response.status_code}")

def process_census_data(z):
    file_list = z.namelist()
    csv_file = [f for f in file_list if f.endswith('.csv') and 'data' in f.lower()][0]
    print(f"Processing {csv_file}...")
    
    # MAPPING VALIDÉ (Source: StatCan 2021 Profil RTA)
    mapping = {
        # Population et Âge (ID 8 = Total population)
        8: 'age_total',
        14: 'age_15_19', 15: 'age_20_24', 16: 'age_25_29', 17: 'age_30_34',
        18: 'age_35_39', 19: 'age_40_44', 20: 'age_45_49', 21: 'age_50_54',
        22: 'age_55_59', 23: 'age_60_64', 25: 'age_65_69', 26: 'age_70_74',
        27: 'age_75_79', 28: 'age_80_84', 29: 'age_85_plus',
        
        # Revenu des ménages (ID 260 = Total households)
        260: 'income_total_hh',
        261: 'inc_u5', 262: 'inc_5_10', 263: 'inc_10_15', 264: 'inc_15_20', 265: 'inc_20_25', 266: 'inc_25_30',
        267: 'inc_30_35', 268: 'inc_35_40', 269: 'inc_40_45', 270: 'inc_50_60',
        271: 'inc_60_70', 272: 'inc_70_80', 273: 'inc_80_90', 274: 'inc_90_100',
        277: 'inc_100_125', 278: 'inc_125_150', 279: 'inc_150_200',         280: 'inc_200p',
        243: 'median_income_hh', # Median total income of household in 2020 ($)
        
        # Éducation (ID 1998 = Total population 15+)
        1998: 'edu_total_15p',
        1999: 'edu_none',
        2000: 'edu_secondary',
        2006: 'edu_college',
        2008: 'edu_university',
        
        # Langue (ID 735 = Total responses for language spoken most often at home)
        735: 'lang_total',
        739: 'lang_french',
        
        # Logement (ID 1414 = Total private households)
        1414: 'tenure_total',
        1415: 'tenure_owner'
    }
    
    all_requested_ids = set(mapping.keys())
    
    relevant_data = []
    with z.open(csv_file) as f:
        chunk_iter = pd.read_csv(f, chunksize=200000, encoding='ISO-8859-1', 
                                 usecols=['GEO_NAME', 'CHARACTERISTIC_ID', 'C1_COUNT_TOTAL'])
        for chunk in chunk_iter:
            chunk = chunk[chunk['GEO_NAME'].str.startswith(('G', 'H', 'J'), na=False)]
            chunk = chunk[chunk['CHARACTERISTIC_ID'].isin(all_requested_ids)]
            relevant_data.append(chunk)
            
    df = pd.concat(relevant_data)
    df_pivot = df.pivot(index='GEO_NAME', columns='CHARACTERISTIC_ID', values='C1_COUNT_TOTAL')
    df_pivot = df_pivot.rename(columns=mapping)
    
    for col in df_pivot.columns:
        df_pivot[col] = pd.to_numeric(df_pivot[col], errors='coerce')
    
    # --- CALCULS DE STANDARDISATION (%) ---
    
    # Revenus (Distribution)
    df_pivot['pct_income_0_30k'] = (df_pivot[['inc_u5', 'inc_5_10', 'inc_10_15', 'inc_15_20', 'inc_20_25', 'inc_25_30']].sum(axis=1) / df_pivot['income_total_hh']) * 100
    df_pivot['pct_income_30_60k'] = (df_pivot[['inc_30_35', 'inc_35_40', 'inc_40_45', 'inc_50_60']].sum(axis=1) / df_pivot['income_total_hh']) * 100
    df_pivot['pct_income_60_100k'] = (df_pivot[['inc_60_70', 'inc_70_80', 'inc_80_90', 'inc_90_100']].sum(axis=1) / df_pivot['income_total_hh']) * 100
    df_pivot['pct_income_100k_plus'] = (df_pivot[['inc_100_125', 'inc_125_150', 'inc_150_200', 'inc_200p']].sum(axis=1) / df_pivot['income_total_hh']) * 100
    
    # Âge (Standardisé sur population totale)
    df_pivot['pct_age_15_24'] = ((df_pivot['age_15_19'] + df_pivot['age_20_24']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_25_34'] = ((df_pivot['age_25_29'] + df_pivot['age_30_34']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_35_44'] = ((df_pivot['age_35_39'] + df_pivot['age_40_44']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_45_54'] = ((df_pivot['age_45_49'] + df_pivot['age_50_54']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_55_64'] = ((df_pivot['age_55_59'] + df_pivot['age_60_64']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_65_74'] = ((df_pivot['age_65_69'] + df_pivot['age_70_74']) / df_pivot['age_total']) * 100
    df_pivot['pct_age_75_plus'] = ((df_pivot['age_75_79'] + df_pivot['age_80_84'] + df_pivot['age_85_plus']) / df_pivot['age_total']) * 100
    
    # Éducation (Standardisé sur pop 15+)
    df_pivot['pct_edu_none'] = (df_pivot['edu_none'] / df_pivot['edu_total_15p']) * 100
    df_pivot['pct_edu_secondary'] = (df_pivot['edu_secondary'] / df_pivot['edu_total_15p']) * 100
    df_pivot['pct_edu_college'] = (df_pivot['edu_college'] / df_pivot['edu_total_15p']) * 100
    df_pivot['pct_edu_university'] = (df_pivot['edu_university'] / df_pivot['edu_total_15p']) * 100
    
    # Langue et Tenure
    df_pivot['pct_french'] = (df_pivot['lang_french'] / df_pivot['lang_total']) * 100
    df_pivot['pct_owners'] = (df_pivot['tenure_owner'] / df_pivot['tenure_total']) * 100
    
    final_cols = [
        'age_total', 'median_income_hh', 'pct_income_0_30k', 'pct_income_30_60k', 'pct_income_60_100k', 'pct_income_100k_plus',
        'pct_age_15_24', 'pct_age_25_34', 'pct_age_35_44', 'pct_age_45_54', 'pct_age_55_64', 'pct_age_65_74', 'pct_age_75_plus',
        'pct_edu_none', 'pct_edu_secondary', 'pct_edu_college', 'pct_edu_university',
        'pct_french', 'pct_owners'
    ]
    
    return df_pivot[final_cols]

if __name__ == "__main__":
    url = "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=013"
    output_path = "data/processed/census_2021_rta.csv"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        z = download_data(url)
        processed_df = process_census_data(z)
        processed_df.to_csv(output_path)
        print(f"Success! Saved to {output_path}")
        print(f"Sample (A0A):\n{processed_df.loc[['A0A']].T}")
    except Exception as e:
        print(f"Error: {e}")
