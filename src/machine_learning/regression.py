from pathlib import Path
import re

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

BASE = Path(__file__).resolve().parent
DATA_PATH = BASE / "data" / "Automobile_data.csv"
TARGET = "horsepower"
FEATURE_CANDIDATES = [
    "engine-size", "curb-weight", "width", "length", "wheel-base",
    "compression-ratio", "city-mpg", "highway-mpg", "peak-rpm",
    "bore", "stroke", "height", "symboling",
]

def normalize_column(name):
    return re.sub(r"[\s_]+", "-", str(name).strip().lower())

def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Missing {DATA_PATH}. Download the Kaggle CSV and save it as "
            "'data/Automobile_data.csv'."
        )

    df = pd.read_csv(DATA_PATH, na_values=["?", "NA", "N/A", ""])
    df.columns = [normalize_column(c) for c in df.columns]

    if TARGET not in df.columns:
        raise ValueError(
            f"Target '{TARGET}' not found. CSV columns: {df.columns.tolist()}"
        )

    feature_cols = [c for c in FEATURE_CANDIDATES if c in df.columns]
    if not feature_cols:
        raise ValueError(f"No expected numeric predictors found: {df.columns.tolist()}")

    for col in [TARGET, *feature_cols]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    original_rows = len(df)
    df = df[[*feature_cols, TARGET]].dropna().copy()
    if len(df) < 10:
        raise ValueError(f"Only {len(df)} complete rows remain after cleaning.")

    print("=== Dataset overview ===")
    print(f"Original rows: {original_rows}")
    print(f"Rows after cleaning: {len(df)}")
    print(f"Target: {TARGET}")
    print(f"Features: {feature_cols}")
    print(df.describe().round(2))

    X, y = df[feature_cols], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LinearRegression()
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("\\n=== Linear Regression results ===")
    print(f"Train rows: {len(X_train)} | Test rows: {len(X_test)}")
    print(f"MAE:  {mae:.2f} horsepower")
    print(f"RMSE: {rmse:.2f} horsepower")
    print(f"R²:   {r2:.3f}")

    coef = pd.DataFrame({"feature": feature_cols, "coefficient": model.coef_})
    print("\\nFeature coefficients (standardized inputs):")
    print(coef.sort_values("coefficient", key=np.abs, ascending=False).to_string(index=False))

    # The training export is the only one that may be used as RAG reference data.
    train_export = X_train.copy()
    train_export[TARGET] = y_train
    train_export.to_csv(BASE / "data" / "train_reference.csv", index=False)

    # Keep this file private from the LLM until predictions have been made.
    test_export = X_test.copy()
    test_export[TARGET] = y_test
    test_export.to_csv(BASE / "data" / "test_holdout.csv", index=False)

    results = pd.DataFrame({
        "actual_horsepower": y_test,
        "predicted_horsepower": y_pred,
        "absolute_error": np.abs(y_test.to_numpy() - y_pred),
    }, index=y_test.index)
    results.to_csv(BASE / "data" / "linear_regression_test_predictions.csv")
    print("\\nSample predictions:")
    print(results.head(10).round(2).to_string())

    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.75)
    low = min(float(y_test.min()), float(np.min(y_pred)))
    high = max(float(y_test.max()), float(np.max(y_pred)))
    plt.plot([low, high], [low, high], linestyle="--")
    plt.xlabel("Actual horsepower")
    plt.ylabel("Predicted horsepower")
    plt.title("Actual vs. predicted horsepower")
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()
