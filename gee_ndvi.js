// Acess code at: 
// https://code.earthengine.google.com/7f6ca2d44c9e569677f2b6193581175a

// Model from: https://geohackweek.github.io/GoogleEarthEngine/03-load-imagery/

//Load farm, set the map view and zoom level, and add farm to map
var fb = ee.FeatureCollection('users/joselvdm/master_file/artemio/Artemio_A');
fb = fb.geometry();
Map.addLayer(fb, {color: 'red'}, 'Class G');
Map.centerObject(fb,10);

//Load Landsat 8 SR image within boundary and target range
var l8collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
                 .filterDate('2013-01-01','2020-03-01')
                 .filterBounds(fb);
print(l8collection)

//Mask pixels with clouds and cloud shadows ---------------------------

//Surface reflectance products come with a "pixel_qa" band
//that is based on the cfmask. Read more here:
// https://landsat.usgs.gov/landsat-surface-reflectance-quality-assessment

//create function to mask clouds, cloud shadows, snow
var maskClouds = function(image){
  var pixel_qa = image.select('pixel_qa');
  return image.updateMask(pixel_qa.eq(322));
};

//use "map" to apply the function to each image in the collection
var l8masked = l8collection.map(maskClouds);

//visualize the first image in the collection, pre- and pst-mask
var visParams = {bands: ['B4','B3','B2'], min: 150, max: 2000}

Map.addLayer(ee.Image(l8collection.first()), visParams, 'inspection', false)
Map.addLayer(ee.Image(l8masked.first()), visParams, 'cloud masked', false)
Map.addLayer(ee.Image(l8collection.first()), visParams, 'original', false)

// create function to add NDVI using NIR (B5) and the red band (B4)
var getNDVI = function(img){
  return img.addBands(img.normalizedDifference(['B5','B4']).rename('NDVI'));
};

// map over image collection
var l8ndvi = l8masked.map(getNDVI);

//print one image to see the band is now there
print(ee.Image(l8ndvi.first()));

//for each pixel, select the "best" set of bands from available images
//based on the maximum NDVI/greenness
var composite = l8ndvi.qualityMosaic('NDVI').clip(fb);
print(composite);

//Visualize NDVI
var ndviPalette = ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
               '74A901', '66A000', '529400', '3E8601', '207401', '056201',
               '004C00', '023B01', '012E01', '011D01', '011301'];
Map.addLayer(composite.select('NDVI'),
            {min: 0, max: 1, palette: ndviPalette}, 'ndvi');
            
//Visualize true color composite
Map.addLayer(composite, {bands: ['B4','B3','B2'], min: 0, max: 2000}, 'true color composite', false);

// Chart of time series of mean NDVI in farm
//from the landsat 8 computed NDVI
var chart = ui.Chart.image.series({
    imageCollection: l8ndvi.select('NDVI'),
    region: fb,
    reducer: ee.Reducer.mean(),
   scale: 250,
  })
var options = {
  title: 'NDVI Band Mean Landsat 8 Artemio CLASS A',
  };
print(chart.setOptions(options)); //*Can export the figure or data inthe pop-out
