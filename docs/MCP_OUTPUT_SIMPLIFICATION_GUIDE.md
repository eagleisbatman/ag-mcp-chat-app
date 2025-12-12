# MCP Output Simplification Guide

This document lists all technical outputs from MCP servers and how the LLM should explain them to farmers in simple terms.

---

## 1. AccuWeather MCP

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `temperature: 17.2` | 17.2°C | "17°C - Cool weather, good for working outdoors" |
| `humidity: 44` | 44% | "44% humidity - Air is dry, crops may need watering" |
| `humidity: 85` | 85% | "85% humidity - Very humid, watch for fungal diseases" |
| `wind_speed: 13` | 13 km/h | "13 km/h wind - Light breeze, safe for spraying" |
| `wind_speed: 35` | 35 km/h | "35 km/h wind - Strong wind, avoid spraying pesticides" |
| `wind_direction: E` | E, NE, SW | "Wind from the East" (expand abbreviation) |
| `has_precipitation: false` | false | "No rain expected" |
| `has_precipitation: true` | true | "Rain expected - plan field work accordingly" |
| `conditions: "Partly sunny"` | Text | Keep as-is, already farmer-friendly |

### Farming Context to Add:
- Temperature < 10°C: "Too cold for most tropical crops"
- Temperature 20-30°C: "Ideal growing temperature for most crops"
- Temperature > 35°C: "Heat stress possible, ensure irrigation"
- Humidity > 80%: "High disease risk, check for fungal infections"
- Wind > 25 km/h: "Do not spray pesticides, chemicals will drift"

---

## 2. ISDA Soil MCP (Africa)

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `ph: 6.5` | 6.5 | "pH 6.5 - Slightly acidic to neutral, good for most crops" |
| `ph: 5.0` | 5.0 | "pH 5.0 - Too acidic, consider adding lime" |
| `ph: 8.0` | 8.0 | "pH 8.0 - Alkaline soil, may need sulfur or organic matter" |
| `nitrogen_total: 1.4 g/kg` | 1.4 g/kg | "Nitrogen: Medium level - may need fertilizer for high-yield crops" |
| `phosphorous_extractable: 13.9 ppm` | 13.9 ppm | "Phosphorus: Good level - supports root growth" |
| `potassium_extractable: 297.9 ppm` | 297.9 ppm | "Potassium: High level - good for fruit and grain development" |
| `texture_class: "Sandy Clay Loam"` | Text | "Sandy Clay Loam - Balanced soil, holds water well but drains" |
| `cation_exchange_capacity: 26.1 cmol(+)/kg` | 26.1 | "CEC 26.1 - Soil can hold nutrients well (good fertility potential)" |
| `carbon_organic: 12.5 g/kg` | 12.5 g/kg | "Organic matter: Good level - healthy soil with nutrients" |
| `bulk_density: 1.2 g/cm³` | 1.2 | "Soil density: Normal - not compacted, roots can grow easily" |

### pH Interpretation Guide:
- < 5.5: "Very acidic - add agricultural lime"
- 5.5-6.0: "Slightly acidic - suitable for tea, potatoes, berries"
- 6.0-7.0: "Ideal for most vegetables, grains, and legumes"
- 7.0-7.5: "Neutral - good for wheat, maize, beans"
- > 7.5: "Alkaline - may need sulfur or gypsum"

### Nitrogen Levels (g/kg):
- < 1.0: "Low - apply nitrogen fertilizer (urea, compost)"
- 1.0-1.5: "Medium - light fertilizer application recommended"
- > 1.5: "Good - may not need additional nitrogen"

### Phosphorus Levels (ppm):
- < 10: "Low - apply DAP or bone meal"
- 10-20: "Medium - adequate for most crops"
- > 20: "High - no phosphorus needed"

### Potassium Levels (ppm):
- < 150: "Low - apply potash or wood ash"
- 150-250: "Medium - adequate"
- > 250: "High - excellent for fruiting crops"

### Texture Explanations:
- "Sandy": "Drains quickly, needs frequent watering and fertilizer"
- "Clay": "Holds water well but can get waterlogged"
- "Loam": "Balanced, ideal for most crops"
- "Sandy Loam": "Good drainage, moderate water retention"
- "Clay Loam": "Fertile but may need drainage"
- "Sandy Clay Loam": "Balanced texture, good for diverse crops"

---

## 3. Feed Formulation MCP (Ethiopia)

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `fd_cp: 11.82` | 11.82% | "Protein: 11.8% - Moderate protein, good for maintenance" |
| `fd_cp: 35.5` | 35.5% | "Protein: 35.5% - High protein, excellent for milk production" |
| `fd_dm: 92.05` | 92.05% | "Dry matter: 92% - Very dry feed, stores well" |
| `fd_dm: 25.0` | 25% | "Dry matter: 25% - Fresh/wet feed, use quickly" |
| `fd_ndf: 41.92` | 41.92% | "Fiber (NDF): 42% - Moderate fiber, good for digestion" |
| `fd_adf: 36.62` | 36.62% | "Digestible fiber: 37% - Reasonably digestible" |
| `fd_type: "Forage"` | Forage | "Type: Forage - Bulk feed for filling the stomach" |
| `fd_type: "Concentrate"` | Concentrate | "Type: Concentrate - Energy-rich, give in small amounts" |
| `fd_category: "Indigenous browse spp"` | Text | "Category: Local tree leaves/shrubs" |
| `fd_category: "Oilseed cakes and meals"` | Text | "Category: Protein-rich byproducts from oil extraction" |

### Protein Level Guide for Dairy:
- < 8%: "Low protein - only for dry cows or as filler"
- 8-14%: "Moderate protein - good for maintenance and light work"
- 14-20%: "Good protein - suitable for growing calves and moderate milk"
- 20-30%: "High protein - excellent for high-producing dairy cows"
- > 30%: "Very high protein - use as protein supplement, mix with other feeds"

### Feed Type Explanations:
- "Forage": "Grass, hay, or leaves - provides bulk and fiber"
- "Concentrate": "Grains, cakes - provides energy and protein in small volume"
- "Roughage": "Straw, stalks - mainly fiber, low nutrition"
- "Supplement": "Minerals, vitamins - add small amounts to complete diet"

### Common Ethiopian Feed Names to Explain:
- "Noug cake": "Byproduct from noug (niger seed) oil - high protein supplement"
- "Teff straw": "Leftover from teff harvest - low nutrition but good filler"
- "Atella": "Brewery waste - wet feed, moderate protein, use fresh"
- "Wheat bran": "Outer layer of wheat grain - moderate protein and fiber"

---

## 4. NextGen Fertilizer MCP (Ethiopia)

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `urea: 100 kg/ha` | 100 kg/ha | "Urea: 100 kg per hectare - Apply in 2-3 splits during growth" |
| `nps: 150 kg/ha` | 150 kg/ha | "NPS: 150 kg per hectare - Apply at planting for nitrogen, phosphorus, sulfur" |
| `compost: 5 tons/ha` | 5 tons/ha | "Compost: 5 tons per hectare - Spread before plowing" |
| `vermicompost: 2 tons/ha` | 2 tons/ha | "Worm compost: 2 tons per hectare - Very rich, use less than regular compost" |
| `expected_yield: 4.5 t/ha` | 4.5 t/ha | "Expected harvest: 4.5 tons per hectare with this fertilizer plan" |

### Fertilizer Explanations:
- "Urea": "White granules, 46% nitrogen - makes leaves green and crops grow"
- "NPS": "Nitrogen-Phosphorus-Sulfur blend - complete starter fertilizer for Ethiopia"
- "DAP": "Di-ammonium phosphate - good for root development"
- "TSP": "Triple super phosphate - pure phosphorus for roots and flowers"
- "Potash/MOP": "Muriate of potash - helps fruits, grains, and disease resistance"

### Application Timing:
- "At planting": "Apply NPS/DAP in the planting hole or furrow"
- "Top dressing": "Apply urea when plants are 30-45 days old"
- "Split application": "Divide urea into 2-3 doses during growing season"

---

## 5. EDACaP Climate MCP (Ethiopia)

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `seasonal_forecast` | "Above normal rainfall" | "More rain than usual expected this season" |
| `probability: 0.65` | 65% | "65% chance - Most likely to happen" |
| `tercile: "above"` | above/normal/below | "Above normal" = more than average |
| `crop_yield_forecast` | 3.2 t/ha | "Expected wheat yield: 3.2 tons per hectare this season" |

---

## 6. AgriVision Plant Diagnosis MCP

### Technical Outputs:
| Field | Example | Farmer-Friendly Explanation |
|-------|---------|----------------------------|
| `disease: "Late Blight"` | Disease name | "Late Blight - A fungal disease that spreads in wet weather" |
| `confidence: 0.87` | 87% | "87% confident - This is most likely the problem" |
| `pest: "Aphids"` | Pest name | "Aphids - Small insects that suck plant juice from leaves" |
| `nutrient_deficiency: "Nitrogen"` | Nutrient | "Nitrogen deficiency - Leaves turn yellow, plant grows slowly" |

### Disease/Pest Treatment Context:
- Always add: "Consult your local extension officer for approved treatments"
- Mention organic options first when available
- Include timing: "Spray early morning or late evening"

---

## System Prompt Guidelines for LLM

The LLM should follow these rules when presenting MCP data:

1. **Always show the number AND the interpretation**
   - ❌ "pH is 6.5"
   - ✅ "pH is 6.5, which is slightly acidic to neutral - ideal for most crops like maize, wheat, and vegetables"

2. **Convert technical terms to farmer language**
   - ❌ "Crude protein (CP) is 35.5%"
   - ✅ "Protein content is 35.5% - this is very high, excellent for boosting milk production"

3. **Add farming action when relevant**
   - ❌ "Nitrogen is low at 0.8 g/kg"
   - ✅ "Nitrogen is low at 0.8 g/kg - consider adding urea or compost before planting"

4. **Explain unfamiliar terms in parentheses**
   - ✅ "NPS fertilizer (Nitrogen-Phosphorus-Sulfur blend for Ethiopian soils)"
   - ✅ "NDF fiber (the part of feed that fills the cow's stomach)"

5. **Use local context and examples**
   - For Ethiopia: Reference teff, maize, wheat, noug
   - For India: Reference rice, wheat, cotton, sugarcane
   - Use local units when appropriate

6. **Translate technical data into decisions**
   - ❌ "Wind speed is 28 km/h"
   - ✅ "Wind is 28 km/h - too strong for spraying pesticides, wait for calmer weather"

---

## Translation Guidelines

When responding in local languages:

1. **Keep numbers as-is** - "pH 6.5" stays as "pH 6.5" in all languages
2. **Translate the explanation** - The interpretation should be in the user's language
3. **Use local terms for common items**:
   - Amharic: Use "ዩሪያ" for urea, "ፎስፌት" for phosphate
   - Hindi: Use "यूरिया" for urea, "खाद" for compost/manure
4. **Keep scientific names but add local names**:
   - "Acacia albida (locally known as Grar in Amharic)"

---

## Examples of Good vs Bad Responses

### Weather Query

**Bad Response:**
> Temperature: 17.2°C, Humidity: 44%, Wind: 13 km/h E, has_precipitation: false

**Good Response:**
> 🌤️ Current weather at your farm:
> - **Temperature: 17°C** - Cool and comfortable for field work
> - **Humidity: 44%** - Dry air, your crops may need watering
> - **Wind: 13 km/h from the East** - Light breeze, perfect for spraying if needed
> - **No rain expected today** - Good day for harvesting or drying crops

### Soil Query

**Bad Response:**
> pH: 6.5, nitrogen_total: 1.4 g/kg, phosphorous_extractable: 13.9 ppm, texture_class: Sandy Clay Loam

**Good Response:**
> 🌱 Your soil analysis:
> - **pH: 6.5** - Slightly acidic to neutral, excellent for maize, wheat, and vegetables
> - **Nitrogen: 1.4 g/kg** - Medium level, you may need to add urea or compost for high yields
> - **Phosphorus: 13.9 ppm** - Good level, supports strong root growth
> - **Soil type: Sandy Clay Loam** - Balanced soil that holds water well but also drains, ideal for most crops

### Feed Query

**Bad Response:**
> Acacia albida: fd_cp 19.65, fd_dm 92.05, fd_ndf 41.92

**Good Response:**
> 🐄 For your dairy cows, **Acacia albida** (Grar tree leaves) is an excellent choice:
> - **Protein: 19.7%** - High protein content, great for milk production
> - **Dry matter: 92%** - Very dry, stores well without spoiling
> - **Fiber: 42%** - Good fiber for healthy digestion
> 
> This is a locally available tree fodder that many Ethiopian farmers use successfully!

