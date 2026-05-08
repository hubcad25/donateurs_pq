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
    # First, ensure it's string to use .str
    df['Montant total'] = df['Montant total'].astype(str)
    # Replace comma with dot and remove any whitespace or other characters if needed
    df['Montant total'] = df['Montant total'].str.replace(',', '.').str.strip()
    
    # Handle cases where "Montant total" might be "nan" or empty
    df['Montant total'] = pd.to_numeric(df['Montant total'], errors='coerce')
    
    # Drop rows where Montant total is NaN
    df = df.dropna(subset=['Montant total'])
    
    # Extract RTA from Code postal (first 3 characters)
    # Some codes might be missing or malformed, handle them
    df['RTA'] = df['Code postal'].str.strip().str[:3].str.upper()
    
    # Aggregate by RTA
    # Sum, Count, Mean
    # Ensure RTA is not null
    df = df.dropna(subset=['RTA'])
    aggregated = df.groupby('RTA')['Montant total'].agg(['sum', 'count', 'mean']).reset_index()
    
    # Rename columns for clarity
    aggregated.columns = ['RTA', 'Somme', 'Nombre de donateurs', 'Moyenne']
    
    # Save to CSV
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    aggregated.to_csv(output_file, index=False)
    print(f"Saved aggregated data to {output_file}")

if __name__ == "__main__":
    url = "https://donnees.electionsquebec.qc.ca/production/provincial/financement/contribution/contributions-pro-fr.csv"
    raw_path = "data/raw/contributions-pro-fr.csv"
    processed_path = "data/processed/donations_rta.csv"
    
    download_csv(url, raw_path)
    process_data(raw_path, processed_path)
