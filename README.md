# baltimoremaps
By: Adam Li

This is an interactive web app that utilizes python for data preprocessing/mining and d3.js for data visualization. It creates a map of the USA based on census of the different counties shape files and then populates colors based on # of republican vs. democrat votes within each state. 

The tools required to get the data working is:
1. ogr2ogr
2. topojson

These are both downloadable via npm, which is the node package manager. 

## 1. Data Cleaning
This is the first step in the project. Refer to the jupyter notebook for how the data is processed from .shp files into topojson files. 

## 2. Data Analysis
This step is pretty simple. I just pull data from http://www.cnn.com/election/primaries/counties/ia/Dem, or Kaggle: https://www.kaggle.com/benhamner/2016-us-election and compute the % of republican voters within a state.

## 3. Data Visualization
This step uses d3.js, colorbrewer, jquery and queue to produce a chloropleth map of the USA based on % of republican voters with a colorrange from red to blue. D3.js also allows enhanced interactivity, where I added the ability to zoom in on a state and see some of the largest city locations within that state.

## To Do:
In the future, this repository would be great to help get set up in a data science project that utilizes geodata and visualization of a map using d3.js.
