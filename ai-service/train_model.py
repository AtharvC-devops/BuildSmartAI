"""
BuildSmartAI -- Real Estate Price Prediction: Model Training Pipeline
=====================================================================

Loads real Indian real estate data from Kaggle, cleans and feature-engineers
the raw data, trains an XGBRegressor pipeline, evaluates performance, and
exports production artifacts (model + location list).

Prerequisites
-------------
1.  Install dependencies:
        pip install -r requirements.txt

2.  Set up Kaggle API credentials so `kagglehub` can download datasets:
      a) Go to https://www.kaggle.com/settings  ->  "Create New Token"
      b) This downloads a `kaggle.json` file with your `username` and `key`.
      c) Place it at:
           * Windows : C:\\Users\\<YOU>\\.kaggle\\kaggle.json
           * Linux   : ~/.kaggle/kaggle.json
      d) Ensure the file is NOT world-readable:
           chmod 600 ~/.kaggle/kaggle.json   (Linux/macOS)

3.  Run the script:
        python train_model.py

Outputs
-------
    ai-service/buildsmart_model.pkl   -- Serialized sklearn Pipeline (XGBoost)
    ai-service/location_list.json     -- Valid locations for frontend dropdowns
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import warnings
from pathlib import Path
from typing import Optional

# Force UTF-8 output on Windows to avoid UnicodeEncodeError in PowerShell
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVR
from xgboost import XGBRegressor

warnings.filterwarnings("ignore", category=FutureWarning)

# --- Constants ----------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_OUTPUT_PATH = SCRIPT_DIR / "buildsmart_model.pkl"
LOCATION_LIST_PATH = SCRIPT_DIR / "location_list.json"
RANDOM_STATE = 42
TEST_SIZE = 0.20
LOCATION_FREQUENCY_THRESHOLD = 10   # locations with < N samples -> "Other"
SQFT_PER_BHK_MIN = 300              # minimum realistic sqft per bedroom
LAKH_TO_INR = 100_000               # 1 Lakh = INR 1,00,000


# ===============================================================================
# 1. DATASET LOADING
# ===============================================================================

def _try_kagglehub_download(dataset_slug: str) -> Optional[str]:
    """Attempt to download a dataset via kagglehub; return path or None."""
    try:
        import kagglehub  # noqa: F811
        path = kagglehub.dataset_download(dataset_slug)
        print(f"  [OK] Downloaded '{dataset_slug}' -> {path}")
        return str(path)
    except Exception as exc:
        print(f"  [X] kagglehub download failed for '{dataset_slug}': {exc}")
        return None


def _find_csv_files(directory: str) -> list[str]:
    """Recursively find all CSV files under a directory."""
    csv_files = []
    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(".csv"):
                csv_files.append(os.path.join(root, f))
    return csv_files


def load_bengaluru_dataset() -> Optional[pd.DataFrame]:
    """
    Load the Bengaluru House Price dataset.
    Tries multiple Kaggle slugs, then falls back to a local CSV search.
    """
    print("\n[1/5] Loading Bengaluru House Price dataset ...")

    kaggle_slugs = [
        "amitabhajoy/bengaluru-house-price-data",
        "sumanbera/bengaluru-house-price-dataset",
    ]

    dataset_path = None
    for slug in kaggle_slugs:
        dataset_path = _try_kagglehub_download(slug)
        if dataset_path:
            break

    # Fallback: check for local CSV in ai-service/data/
    if not dataset_path:
        local_data_dir = SCRIPT_DIR / "data"
        if local_data_dir.exists():
            for csv_file in local_data_dir.glob("*bengaluru*"):
                dataset_path = str(local_data_dir)
                break

    if not dataset_path:
        print("  [!] Bengaluru dataset not available. Skipping.")
        return None

    csv_files = _find_csv_files(dataset_path)
    if not csv_files:
        print(f"  [!] No CSV files found in {dataset_path}")
        return None

    # Prefer the file with 'Bengaluru' or 'house' in the name
    target_csv = csv_files[0]
    for cf in csv_files:
        basename = os.path.basename(cf).lower()
        if "bengaluru" in basename or "house" in basename:
            target_csv = cf
            break

    df = pd.read_csv(target_csv)
    print(f"  [OK] Loaded {len(df):,} rows from {os.path.basename(target_csv)}")
    df["_source"] = "bengaluru"
    return df


def load_national_dataset() -> Optional[pd.DataFrame]:
    """
    Load the Indian Real Estate Market dataset (2023-25).
    """
    print("\n[1/5] Loading Indian Real Estate Market dataset ...")

    kaggle_slugs = [
        "shambhurajejagadale/indian-real-estate-market-dataset-2023-25",
    ]

    dataset_path = None
    for slug in kaggle_slugs:
        dataset_path = _try_kagglehub_download(slug)
        if dataset_path:
            break

    if not dataset_path:
        local_data_dir = SCRIPT_DIR / "data"
        if local_data_dir.exists():
            for csv_file in local_data_dir.glob("*real_estate*"):
                dataset_path = str(local_data_dir)
                break

    if not dataset_path:
        print("  [!] National Real Estate dataset not available. Skipping.")
        return None

    csv_files = _find_csv_files(dataset_path)
    if not csv_files:
        print(f"  [!] No CSV files found in {dataset_path}")
        return None

    target_csv = csv_files[0]
    for cf in csv_files:
        basename = os.path.basename(cf).lower()
        if "real_estate" in basename or "indian" in basename:
            target_csv = cf
            break

    df = pd.read_csv(target_csv)
    print(f"  [OK] Loaded {len(df):,} rows from {os.path.basename(target_csv)}")
    df["_source"] = "national"
    return df


def load_datasets() -> pd.DataFrame:
    """
    Load and merge available datasets into a single DataFrame with
    standardized column names.
    """
    bengaluru_df = load_bengaluru_dataset()
    national_df = load_national_dataset()

    frames: list[pd.DataFrame] = []

    # -- Standardize Bengaluru dataset -------------------------------------
    if bengaluru_df is not None and len(bengaluru_df) > 0:
        col_map = {}
        cols_lower = {c.lower().strip(): c for c in bengaluru_df.columns}

        # Map common column name variants -> canonical names
        for target, aliases in {
            "location": ["location", "loc"],
            "total_sqft": ["total_sqft", "total sqft", "sqft", "area_sqft"],
            "bath": ["bath", "bathroom", "bathrooms", "no_of_bathrooms"],
            "bhk": ["bhk", "size", "bedrooms", "no_of_bedrooms"],
            "price": ["price", "price_lakhs", "price(lakhs)",
                       "price_in_lakhs", "cost"],
            "area_type": ["area_type", "areatype", "area type"],
        }.items():
            for alias in aliases:
                if alias in cols_lower:
                    col_map[cols_lower[alias]] = target
                    break

        bengaluru_df = bengaluru_df.rename(columns=col_map)

        # Add city column
        if "city" not in bengaluru_df.columns:
            bengaluru_df["city"] = "Bengaluru"

        # Ensure area_type exists
        if "area_type" not in bengaluru_df.columns:
            bengaluru_df["area_type"] = "Unknown"

        # The Bengaluru dataset prices are typically in Lakhs
        if "price" in bengaluru_df.columns:
            bengaluru_df["price_in_lakhs"] = True

        frames.append(bengaluru_df)

    # -- Standardize National dataset --------------------------------------
    if national_df is not None and len(national_df) > 0:
        col_map = {}
        cols_lower = {c.lower().strip(): c for c in national_df.columns}

        for target, aliases in {
            "location": ["location", "locality", "loc",
                         "sub_location", "district"],
            "city": ["city", "city_name"],
            "total_sqft": ["total_sqft", "built_up_area_sqft",
                           "area_sqft", "sqft",
                           "carpet_area", "carpet_area_sqft",
                           "built_up_area", "area",
                           "area_in_sqft"],
            "bath": ["bath", "bathroom", "bathrooms",
                     "no_of_bathrooms"],
            "bhk": ["bhk", "bedrooms", "no_of_bedrooms", "bedroom",
                     "size", "bhk_or_rk"],
            "price": ["price", "price_inr", "price_in_lacs",
                       "price_lakhs", "price(lakhs)",
                       "price_in_lakhs", "price_in_crores",
                       "cost", "resale_price"],
            "area_type": ["area_type", "property_type", "type",
                          "areatype"],
        }.items():
            for alias in aliases:
                if alias in cols_lower:
                    col_map[cols_lower[alias]] = target
                    break

        national_df = national_df.rename(columns=col_map)

        if "area_type" not in national_df.columns:
            national_df["area_type"] = "Unknown"

        if "city" not in national_df.columns:
            national_df["city"] = "Unknown"

        # Detect if prices are in Crores (very large dataset might use this)
        if "price" in national_df.columns:
            # Heuristic: if median price < 50, likely in Crores or Lakhs
            median_price = pd.to_numeric(
                national_df["price"], errors="coerce"
            ).median()
            if median_price and median_price < 500:
                national_df["price_in_lakhs"] = True
            else:
                national_df["price_in_lakhs"] = False

        frames.append(national_df)

    # -- Merge -------------------------------------------------------------
    if not frames:
        print("\n[X] FATAL: No datasets could be loaded!")
        print("  Ensure Kaggle credentials are configured correctly.")
        print("  See docstring at top of this file for setup instructions.")
        sys.exit(1)

    df = pd.concat(frames, ignore_index=True, sort=False)
    print(f"\n  [OK] Combined dataset: {len(df):,} rows, "
          f"{len(df.columns)} columns")
    print(f"    Columns: {list(df.columns)}")
    return df


# ===============================================================================
# 2. DATA CLEANING & FEATURE ENGINEERING
# ===============================================================================

def parse_sqft(value) -> Optional[float]:
    """
    Parse the 'total_sqft' field which may contain:
      - Plain numbers: "1200", "1200.5"
      - Ranges: "1100 - 1280"   -> take the mean
      - Units: "34.46Sq. Meter" -> convert m² -> sqft  (1 m² ≈ 10.7639 sqft)
      - Units: "1500Sq. Yards"  -> convert yd² -> sqft (1 yd² = 9 sqft)
      - Garbage / non-parseable -> None
    """
    if pd.isna(value):
        return None

    s = str(value).strip()

    # Range: "1100 - 1280"
    range_match = re.match(
        r"^([\d,.]+)\s*[-–]\s*([\d,.]+)$", s
    )
    if range_match:
        try:
            lo = float(range_match.group(1).replace(",", ""))
            hi = float(range_match.group(2).replace(",", ""))
            return (lo + hi) / 2.0
        except ValueError:
            return None

    # Square Meter -> sqft
    meter_match = re.search(
        r"([\d,.]+)\s*(?:sq\.?\s*m(?:eter|etre|tr)?s?)", s, re.IGNORECASE
    )
    if meter_match:
        try:
            sqm = float(meter_match.group(1).replace(",", ""))
            return sqm * 10.7639
        except ValueError:
            return None

    # Square Yards -> sqft
    yard_match = re.search(
        r"([\d,.]+)\s*(?:sq\.?\s*y(?:ard|d)?s?)", s, re.IGNORECASE
    )
    if yard_match:
        try:
            sqy = float(yard_match.group(1).replace(",", ""))
            return sqy * 9.0
        except ValueError:
            return None

    # Perch (Sri Lankan / South Indian) -> sqft  (1 perch ≈ 272.25 sqft)
    perch_match = re.search(
        r"([\d,.]+)\s*(?:perch|perches)", s, re.IGNORECASE
    )
    if perch_match:
        try:
            perch = float(perch_match.group(1).replace(",", ""))
            return perch * 272.25
        except ValueError:
            return None

    # Guntha -> sqft  (1 Guntha ≈ 1089 sqft)
    guntha_match = re.search(
        r"([\d,.]+)\s*(?:guntha|gunta)", s, re.IGNORECASE
    )
    if guntha_match:
        try:
            guntha = float(guntha_match.group(1).replace(",", ""))
            return guntha * 1089.0
        except ValueError:
            return None

    # Grounds -> sqft  (1 Ground = 2400 sqft, used in Tamil Nadu)
    ground_match = re.search(
        r"([\d,.]+)\s*(?:grounds?)", s, re.IGNORECASE
    )
    if ground_match:
        try:
            ground = float(ground_match.group(1).replace(",", ""))
            return ground * 2400.0
        except ValueError:
            return None

    # Acres -> sqft  (1 Acre = 43560 sqft)
    acre_match = re.search(
        r"([\d,.]+)\s*(?:acres?|ac)", s, re.IGNORECASE
    )
    if acre_match:
        try:
            acres = float(acre_match.group(1).replace(",", ""))
            return acres * 43560.0
        except ValueError:
            return None

    # Cents -> sqft  (1 Cent ≈ 435.6 sqft, used in Kerala / TN)
    cent_match = re.search(
        r"([\d,.]+)\s*(?:cents?)", s, re.IGNORECASE
    )
    if cent_match:
        try:
            cents = float(cent_match.group(1).replace(",", ""))
            return cents * 435.6
        except ValueError:
            return None

    # Plain number (possibly with commas)
    plain_match = re.match(r"^[\d,.]+$", s)
    if plain_match:
        try:
            return float(s.replace(",", ""))
        except ValueError:
            return None

    # Last resort: extract any leading number
    leading_num = re.match(r"([\d,.]+)", s)
    if leading_num:
        try:
            return float(leading_num.group(1).replace(",", ""))
        except ValueError:
            return None

    return None


def extract_bhk(value) -> Optional[int]:
    """
    Extract BHK / bedroom count from strings like:
      "2 BHK", "3 Bedroom", "4BHK", "2 RK"
    """
    if pd.isna(value):
        return None

    s = str(value).strip()

    # Try direct integer
    try:
        v = int(float(s))
        if 1 <= v <= 20:
            return v
    except (ValueError, OverflowError):
        pass

    # Pattern: "<N> BHK" / "<N>BHK" / "<N> Bedroom" / "<N> RK"
    match = re.search(r"(\d+)\s*(?:bhk|bedroom|rk|bed)", s, re.IGNORECASE)
    if match:
        return int(match.group(1))

    # Just extract the first digit sequence
    digit_match = re.search(r"(\d+)", s)
    if digit_match:
        v = int(digit_match.group(1))
        if 1 <= v <= 20:
            return v

    return None


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full cleaning pipeline:
      1. Parse total_sqft to numeric
      2. Extract / clean BHK
      3. Clean bathrooms
      4. Normalize prices to full INR
      5. Normalize locations (group rare -> "Other")
      6. Remove outliers
    """
    print("\n[2/5] Cleaning and engineering features ...")
    initial_rows = len(df)

    # -- Ensure required columns exist -------------------------------------
    required = ["total_sqft", "bhk", "price"]
    for col in required:
        if col not in df.columns:
            print(f"  [!] Missing required column '{col}' -- will attempt "
                  f"to derive it.")

    # -- 2a. Parse total_sqft ----------------------------------------------
    if "total_sqft" in df.columns:
        df["total_sqft"] = df["total_sqft"].apply(parse_sqft)
        n_invalid = df["total_sqft"].isna().sum()
        print(f"  * Parsed total_sqft: {n_invalid:,} unparseable -> dropped")
        df = df.dropna(subset=["total_sqft"])
        df = df[df["total_sqft"] > 0]
    else:
        print("  [X] 'total_sqft' column not found. Cannot proceed.")
        sys.exit(1)

    # -- 2b. Extract BHK --------------------------------------------------
    if "bhk" in df.columns:
        df["bhk"] = df["bhk"].apply(extract_bhk)
    elif "size" in df.columns:
        df["bhk"] = df["size"].apply(extract_bhk)

    if "bhk" in df.columns:
        # Fill missing BHK: estimate from sqft (median sqft per BHK)
        valid_bhk = df.dropna(subset=["bhk"])
        if len(valid_bhk) > 0:
            median_sqft_per_bhk = (
                valid_bhk["total_sqft"] / valid_bhk["bhk"]
            ).median()
            if median_sqft_per_bhk > 0:
                df["bhk"] = df["bhk"].fillna(
                    (df["total_sqft"] / median_sqft_per_bhk).round().clip(1)
                )
        df["bhk"] = pd.to_numeric(df["bhk"], errors="coerce")
        df = df.dropna(subset=["bhk"])
        df["bhk"] = df["bhk"].astype(int)
    else:
        # Derive BHK heuristically from sqft
        df["bhk"] = (df["total_sqft"] / 500).round().clip(1).astype(int)
        print("  * BHK column derived from total_sqft (no source column).")

    # -- 2c. Clean bathrooms -----------------------------------------------
    if "bath" in df.columns:
        df["bath"] = pd.to_numeric(df["bath"], errors="coerce")
        # Fill missing baths: assume bhk + 0 for <= 3 BHK, bhk + 1 otherwise
        bath_fill = df["bhk"].apply(lambda x: x if x <= 3 else x + 1)
        df["bath"] = df["bath"].fillna(bath_fill)
        df["bath"] = df["bath"].clip(1)
    else:
        df["bath"] = df["bhk"].apply(lambda x: x if x <= 3 else x + 1)
        print("  * Bath column derived from BHK (no source column).")

    df["bath"] = df["bath"].astype(float)

    # -- 2d. Price conversion to full INR ----------------------------------
    if "price" in df.columns:
        df["price"] = pd.to_numeric(df["price"], errors="coerce")
        df = df.dropna(subset=["price"])
        df = df[df["price"] > 0]

        # Convert from Lakhs where flagged
        if "price_in_lakhs" in df.columns:
            mask = df["price_in_lakhs"] == True  # noqa: E712
            df.loc[mask, "price"] = df.loc[mask, "price"] * LAKH_TO_INR
            df = df.drop(columns=["price_in_lakhs"], errors="ignore")
        else:
            # Heuristic: if median price < 5000, it's likely in Lakhs
            median_p = df["price"].median()
            if median_p < 5000:
                print(f"  * Detected prices in Lakhs (median={median_p:.1f}). "
                      f"Converting to INR.")
                df["price"] = df["price"] * LAKH_TO_INR

        print(f"  * Price range after conversion: "
              f"INR {df['price'].min():,.0f} – INR {df['price'].max():,.0f}")
    else:
        print("  [X] 'price' column not found. Cannot proceed.")
        sys.exit(1)

    # -- 2e. Normalize locations -------------------------------------------
    if "location" in df.columns:
        df["location"] = df["location"].astype(str).str.strip()
        loc_counts = df["location"].value_counts()
        rare_locations = loc_counts[
            loc_counts < LOCATION_FREQUENCY_THRESHOLD
        ].index
        df.loc[df["location"].isin(rare_locations), "location"] = "Other"
        n_unique = df["location"].nunique()
        print(f"  * Locations normalized: {n_unique} unique "
              f"(rare grouped -> 'Other')")
    else:
        df["location"] = "Unknown"

    # -- Normalize city ----------------------------------------------------
    if "city" in df.columns:
        df["city"] = df["city"].astype(str).str.strip().str.title()
    else:
        df["city"] = "Unknown"

    # -- Normalize area_type -----------------------------------------------
    if "area_type" in df.columns:
        df["area_type"] = df["area_type"].astype(str).str.strip().str.title()
    else:
        df["area_type"] = "Unknown"

    # -- 2f. Outlier removal -----------------------------------------------
    before_outlier = len(df)

    # Rule 1: sqft per BHK must be at least 300
    df["sqft_per_bhk"] = df["total_sqft"] / df["bhk"]
    df = df[df["sqft_per_bhk"] >= SQFT_PER_BHK_MIN]

    # Rule 2: Remove extreme price-per-sqft (1st and 99th percentile)
    df["price_per_sqft"] = df["price"] / df["total_sqft"]
    q01 = df["price_per_sqft"].quantile(0.01)
    q99 = df["price_per_sqft"].quantile(0.99)
    df = df[(df["price_per_sqft"] >= q01) & (df["price_per_sqft"] <= q99)]

    # Rule 3: Bathrooms should not exceed BHK + 2
    df = df[df["bath"] <= df["bhk"] + 2]

    # Rule 4: Remove unrealistically tiny or huge properties
    df = df[(df["total_sqft"] >= 200) & (df["total_sqft"] <= 50000)]

    # Clean up helper columns
    df = df.drop(columns=["sqft_per_bhk", "price_per_sqft", "_source"],
                 errors="ignore")

    print(f"  * Outlier removal: {before_outlier:,} -> {len(df):,} rows "
          f"({before_outlier - len(df):,} removed)")
    print(f"  [OK] Final clean dataset: {len(df):,} rows "
          f"(started with {initial_rows:,})")

    return df.reset_index(drop=True)


# ===============================================================================
# 3. MODEL TRAINING PIPELINE
# ===============================================================================

def _compute_metrics(
    y_true: pd.Series | np.ndarray,
    y_pred: np.ndarray,
) -> dict:
    """Compute MAE, MAPE, RMSE, R2 for a prediction set."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    nonzero_mask = np.asarray(y_true) != 0
    if nonzero_mask.sum() > 0:
        mape = (
            np.abs((np.asarray(y_true)[nonzero_mask] - y_pred[nonzero_mask])
                   / np.asarray(y_true)[nonzero_mask])
        ).mean() * 100
    else:
        mape = float("inf")

    return {
        "MAE (INR)": mae,
        "MAPE (%)": mape,
        "RMSE (INR)": rmse,
        "R2 Score": r2,
    }


def build_and_train_model(df: pd.DataFrame) -> tuple:
    """
    Build scikit-learn Pipelines for multiple algorithms, train each one,
    evaluate on the same test set, and return the best-performing pipeline.

    Algorithms compared:
      1. XGBRegressor
      2. RandomForestRegressor
      3. GradientBoostingRegressor
      4. Ridge Regression
      5. SVR (Support Vector Regression)

    Returns (best_pipeline, X_test, y_test, feature_names, all_results).
    """
    print("\n[3/5] Building and training model pipelines ...")
    print("       (comparing 5 algorithms to find the best)\n")

    # -- Define feature columns --------------------------------------------
    categorical_features = []
    for col in ["location", "city", "area_type"]:
        if col in df.columns and df[col].nunique() > 1:
            categorical_features.append(col)

    numerical_features = ["total_sqft", "bhk", "bath"]

    all_features = categorical_features + numerical_features
    target = "price"

    print(f"  * Categorical features : {categorical_features}")
    print(f"  * Numerical features   : {numerical_features}")
    print(f"  * Target               : {target}")

    X = df[all_features].copy()
    y = df[target].copy()

    # -- Train/Test Split --------------------------------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    print(f"  * Train set: {len(X_train):,} | Test set: {len(X_test):,}")

    # -- Preprocessor (shared across all models) ---------------------------
    transformers = []

    if categorical_features:
        transformers.append((
            "cat",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            categorical_features,
        ))

    transformers.append((
        "num",
        StandardScaler(),
        numerical_features,
    ))

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
    )

    # -- Define candidate regressors ---------------------------------------
    candidates = {
        "XGBRegressor": XGBRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        ),
        "RandomForest": RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            min_samples_split=5,
            min_samples_leaf=3,
            random_state=RANDOM_STATE,
        ),
        "Ridge": Ridge(
            alpha=1.0,
        ),
        "SVR": SVR(
            kernel="rbf",
            C=100.0,
            epsilon=0.1,
        ),
    }

    # -- Train & evaluate each candidate -----------------------------------
    results: dict[str, dict] = {}

    for name, regressor in candidates.items():
        print(f"\n  --- Training: {name} ---")
        t_start = time.time()

        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ])

        try:
            pipeline.fit(X_train, y_train)
            elapsed = time.time() - t_start

            y_pred = pipeline.predict(X_test)
            metrics = _compute_metrics(y_test, y_pred)

            results[name] = {
                "pipeline": pipeline,
                "metrics": metrics,
                "train_time_s": elapsed,
            }

            print(f"      R2 = {metrics['R2 Score']:.4f}  |  "
                  f"MAE = INR {metrics['MAE (INR)']:,.0f}  |  "
                  f"Time = {elapsed:.1f}s")

        except Exception as exc:
            elapsed = time.time() - t_start
            print(f"      [X] FAILED after {elapsed:.1f}s: {exc}")
            continue

    if not results:
        print("\n  [X] All models failed! Cannot proceed.")
        sys.exit(1)

    # -- Select the best model (highest R2) --------------------------------
    best_name = max(results, key=lambda k: results[k]["metrics"]["R2 Score"])
    best_pipeline = results[best_name]["pipeline"]
    best_metrics = results[best_name]["metrics"]

    return best_pipeline, X_test, y_test, all_features, results, best_name


# ===============================================================================
# 4. EVALUATION & COMPARISON
# ===============================================================================

def evaluate_models(results: dict, best_name: str) -> dict:
    """Print a comparison leaderboard and return the best model's metrics."""
    print("\n[4/5] Model Comparison Leaderboard")
    print("=" * 90)

    # Header
    print(f"  {'Rank':<5} {'Algorithm':<22} {'R2 Score':>10} "
          f"{'MAE (INR)':>16} {'MAPE (%)':>10} "
          f"{'RMSE (INR)':>16} {'Time (s)':>9}")
    print("  " + "-" * 86)

    # Sort by R2 descending
    sorted_names = sorted(
        results.keys(),
        key=lambda k: results[k]["metrics"]["R2 Score"],
        reverse=True,
    )

    for rank, name in enumerate(sorted_names, 1):
        m = results[name]["metrics"]
        t = results[name]["train_time_s"]
        marker = " << BEST" if name == best_name else ""
        print(f"  {rank:<5} {name:<22} {m['R2 Score']:>10.4f} "
              f"{m['MAE (INR)']:>16,.0f} {m['MAPE (%)']:>10.2f} "
              f"{m['RMSE (INR)']:>16,.0f} {t:>9.1f}{marker}")

    print("=" * 90)
    print(f"\n  [OK] Best algorithm: {best_name} "
          f"(R2 = {results[best_name]['metrics']['R2 Score']:.4f})")

    return results[best_name]["metrics"]


# ===============================================================================
# 5. EXPORT PRODUCTION ARTIFACTS
# ===============================================================================

def export_artifacts(
    pipeline: Pipeline,
    df: pd.DataFrame,
    metrics: dict,
    best_name: str,
) -> None:
    """Export the trained model and location list for production."""
    print("\n[5/5] Exporting production artifacts ...")

    # -- 5a. Save model pipeline -------------------------------------------
    joblib.dump(pipeline, MODEL_OUTPUT_PATH)
    model_size_mb = MODEL_OUTPUT_PATH.stat().st_size / (1024 * 1024)
    print(f"  [OK] Model saved -> {MODEL_OUTPUT_PATH}  ({model_size_mb:.1f} MB)")
    print(f"       Algorithm : {best_name}")

    # -- 5b. Export location list ------------------------------------------
    if "location" in df.columns:
        raw_locations = df["location"].dropna().unique().tolist()
        # Filter to strings only (exclude any lingering float NaN)
        raw_locations = [
            str(loc) for loc in raw_locations
            if isinstance(loc, str) and loc.strip()
        ]
        locations = sorted(raw_locations)
        # Remove "Other" and "Unknown" from the dropdown list
        locations = [
            loc for loc in locations
            if loc not in ("Other", "Unknown", "nan", "None")
        ]
    else:
        locations = []

    location_data = {
        "locations": locations,
        "count": len(locations),
        "best_algorithm": best_name,
        "model_metrics": {k: round(v, 4) for k, v in metrics.items()},
    }

    with open(LOCATION_LIST_PATH, "w", encoding="utf-8") as f:
        json.dump(location_data, f, indent=2, ensure_ascii=False)

    print(f"  [OK] Location list saved -> {LOCATION_LIST_PATH}  "
          f"({len(locations)} locations)")


# ===============================================================================
# MAIN
# ===============================================================================

def main() -> None:
    """End-to-end training pipeline with multi-algorithm comparison."""
    print("=" * 60)
    print("  BuildSmartAI -- Real Estate Price Prediction Pipeline")
    print("  (Multi-Algorithm Comparison Mode)")
    print("=" * 60)

    # Step 1: Load datasets
    raw_df = load_datasets()

    # Step 2: Clean & engineer features
    clean_df = clean_data(raw_df)

    # Step 3: Train all candidate models
    best_pipeline, X_test, y_test, features, results, best_name = (
        build_and_train_model(clean_df)
    )

    # Step 4: Evaluate & compare
    metrics = evaluate_models(results, best_name)

    # Step 5: Export the best model
    export_artifacts(best_pipeline, clean_df, metrics, best_name)

    print("\n" + "=" * 60)
    print("  [OK] Pipeline complete! Artifacts ready for production.")
    print("=" * 60)
    print(f"\n  Best     : {best_name}")
    print(f"  Model    : {MODEL_OUTPUT_PATH}")
    print(f"  Locs     : {LOCATION_LIST_PATH}")
    print(f"  R2       : {metrics['R2 Score']:.4f}")
    print(f"  MAE      : INR {metrics['MAE (INR)']:,.0f}")
    print()


if __name__ == "__main__":
    main()

