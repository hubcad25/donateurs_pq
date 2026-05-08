import pandas as pd
import requests
import os

def download_csv(url, dest):
    print(f"Downloading {url}...")
    response = requests.get(url)
    response.raise_for_status()
    with open(dest, 'wb') as f:
        f.write(response.content)
    print(f"Downloaded to {dest}")

def process_data(input_file, output_file):
    print(f"Processing {input_file}...")
    
    # Read CSV, skipping the preamble (first 2 lines)
    # Encoding is ISO-8859-1, separator is ;
    df = pd.read_csv(input_file, sep=';', encoding='ISO-8859-1', skiprows=2)
    
    # Filter for "Parti québécois"
    df = df[df['Entité politique'] == 'Parti québécois']
    
    # Clean Montant total: "200,00" -> 200.00
    df['Montant total'] = df['Montant total'].astype(str)
    df['Montant total'] = df['Montant total'].str.replace(',', '.').str.strip()
    df['Montant total'] = pd.to_numeric(df['Montant total'], errors='coerce')
    df = df.dropna(subset=['Montant total'])
    
    # Extract RTA from Code postal
    df['RTA'] = df['Code postal'].str.strip().str[:3].str.upper()
    df = df.dropna(subset=['RTA'])
    
    # Ensure "Année financière" is numeric
    df['Year'] = pd.to_numeric(df['Année financière'], errors='coerce')
    df = df.dropna(subset=['Year'])
    df['Year'] = df['Year'].astype(int)
    
    # Aggregate by RTA and Year
    aggregated = df.groupby(['RTA', 'Year'])['Montant total'].agg(['sum', 'count']).reset_index()
    aggregated.columns = ['RTA', 'Year', 'Somme', 'Nombre de donateurs']
    
    # Save to CSV
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    aggregated.to_csv(output_file, index=False)
    print(f"Saved aggregated data by RTA and Year to {output_file}")

if __name__ == "__main__":
    url = "https://donnees.electionsquebec.qc.ca/production/provincial/financement/contribution/contributions-pro-fr.csv"
    raw_path = "data/raw/contributions-pro-fr.csv"
    processed_path = "data/processed/donations_rta_yearly.csv"
    
    # download_csv(url, raw_path) # Skip download to save time if already exists
    process_data(raw_path, processed_path)
