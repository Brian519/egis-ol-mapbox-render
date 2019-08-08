import 'ol/ol.css';
import {Map, View} from 'ol';
// import Map from 'ol/WebGLMap.js';

import MVT from 'ol/format/MVT.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';

import VectorTileSource from 'ol/source/VectorTile.js';
import TileGrid from 'ol/tilegrid/TileGrid';

import {register} from 'ol/proj/proj4.js';
import Projection from 'ol/proj/Projection.js';
import {getWidth as projGetWidth} from 'ol/extent.js';

import proj4 from 'proj4';
import {get as projGet} from 'ol/proj.js';

// import stylefunction from 'ol-mapbox-style/stylefunction';
// import {applyBackground} from 'ol-mapbox-style';

import stylefunction from './src/olms/stylefunction';
import {applyBackground} from './src/olms/index';

proj4.defs("EPSG:4490", "+proj=longlat +ellps=GRS80 +no_defs");
register(proj4);

var projection = new Projection({
    code: 'EPSG:4326',
    extent: [-180, -90, 180, 90]
});

var proj = projGet("EPSG:4326");
var projectionExtent = proj.getExtent();
var size = projGetWidth(projectionExtent) / 512;
var resolutions = new Array(22);
for (var z = 1; z < 22; ++z) {
    resolutions[z] = size / Math.pow(2, z);
}

var view = new View({
    center: [116.376953, 39.904119], // 121.486816, 31.222195
    // center: [0, 0], // 121.486816, 31.222195
    zoom: 13,
    minZoom: 1,
    maxZoom: 22,
    // maxResolution: 0.703125,
    // minResolution: 0.000002682209014892578,
    projection: projection,
    resolutions: resolutions,
    // zoomFactor:4
});

var map = new Map({
    target: 'map',
    //  loadTilesWhileAnimating: true,
    view: view
});


const layerConf = [
    {
        index: "11",// 13, 14, 16, 15, 12, 21, 22
        name: "china_1-10"
    },
    // {
    //     index: "13",// 13, 14, 16, 15, 12, 21, 22
    //     name: "lrdl"
    // },
    // {
    //     index: "14",// 13, 14, 16, 15, 12, 21, 22
    //     name: "other"
    // },
    // {
    //     index: "16",// 13, 14, 16, 15, 12, 21, 22
    //     name: "lfcp"
    // },
    // {
    //     index: "15",// 13, 14, 16, 15, 12, 21, 22
    //     name: "subp"
    // },
    // {
    //     index: "12",// 13, 14, 16, 15, 12, 21, 22
    //     name: "poi"
    // },
    // {
    //     index: "21",// 13, 14, 16, 15, 12, 21, 22
    //     name: "省市县乡村注记"
    // },
    // {
    //     index: "22",// 13, 14, 16, 15, 12, 21, 22
    //     name: "全国省市县乡"
    // }
];

const sources = ['china_1-10', "lrdl", "other", "lfcp", "subp", "poi", "省市县乡注记", "全国省市县乡"];

var styleUrl = "http://10.18.1.185/api/v1/styles/1";
// styleUrl = "http://localhost:8080/map/api/v1/styles/5";
fetch(styleUrl).then(function (response) {   //http://localhost:8089/egis/base/v1/wvts/styles/1
    response.json().then(function (glStyle) {
        console.log(glStyle);

        const sourceMM = [];
        sources.forEach(a => {
            sourceMM[a] = {min: 22, max: 0};
        });

        for (let i = 0; i < glStyle.layers.length; ++i) {
            var layer = glStyle.layers[i];
            if (!!layer.minzoom && layer.maxzoom && sourceMM.hasOwnProperty(layer.source)) {
                sourceMM[layer.source].min = Math.min(sourceMM[layer.source].min, layer.minzoom);
                sourceMM[layer.source].max = Math.max(sourceMM[layer.source].max, layer.maxzoom);
            }
        }

        console.log(sourceMM);

    })
});

//
// china_1-10: {min: 1, max: 22}
// lfcp: {min: 16, max: 22}
// lrdl: {min: 10, max: 22}
// other: {min: 10, max: 22}
// poi: {min: 10, max: 22}
// subp: {min: 12, max: 22}
// 全国省市县乡: {min: 3, max: 15}
// 省市县乡注记: {min: 4, max: 14}

function createLayerConf(minzoom, maxzoom) {
    return {
        minzoom: minzoom,
        maxzoom: maxzoom,

        isIn: function (zoom) {
            // return true;
            return this.minzoom <= zoom && zoom <= this.maxzoom;
        }
    }
}

const layerIndexConf = {

    // 'china_1-10', "lrdl", "other", "lfcp", "subp", "poi", "省市县乡注记", "全国省市县乡"
    // "11", 13, 14, 16, 15, 12, 21, 22

    "11": createLayerConf(1, 22),
    "13": createLayerConf(10, 22),
    "16": createLayerConf(10, 22),
    "15": createLayerConf(10, 22),
    "12": createLayerConf(10, 22),
    "14": createLayerConf(10, 22),
    "21": createLayerConf(3, 15),
    "22": createLayerConf(4, 14),
};

var getTileLayerNames = function (zoom) {
    const names = [];
    for (let v in layerIndexConf) {
        const conf = layerIndexConf[v];
        if (conf.isIn(zoom)) {
            names.push(v);
        }
    }
    return names;
};

//const urlTemplate = 'http://localhost:8080/map/api/v1/tiles/' + conf.index + '/{z}/{x}/{y}.pbf';
const urlTemplate = 'http://10.18.1.185/api/v1/tiles/{index}/{z}/{x}/{y}.pbf';
// const urlTemplate = 'http://localhost:8080/wvts/wvts/tiles/{z}/{x}/{y}.pbf';

const fetchPreFeatures = function (index, z, x, y) {
    const url = urlTemplate.replace('{z}', (tileCoord[0] - 1).toString())
        .replace('{x}', tileCoord[1].toString())
        .replace('{y}', (-tileCoord[2] - 1).toString());

    return fetch(url);
}

const fetchFeatures = function (url, index, tile, done) {
    try {
        fetch(url).then(function (response) {
            if (response.status === 200) {
                response.arrayBuffer().then(function (data) {
                    var format = tile.getFormat();
                    var tileProject = format.readProjection(data);
                    tile.setProjection(tileProject);
                    const fs = format.readFeatures(data, {});
                    done(fs);
                }).catch(function () {
                    done();
                });
            } else {
                done();
            }
        }).catch(function () {
            done();
        });
    } catch (e) {
        console.log(e);
    }
};

const layer0 = new VectorTileLayer({
    declutter: true,
    renderMode: "image",
    // minResolution: resolutions[21],
    // maxResolution: resolutions[10],
    resolutions: resolutions,
    source: new VectorTileSource({
            format: new MVT(),
            projection: projection,
            tileUrlFunction: function (tileCoord) {
                return urlTemplate
                    .replace("{index}", 11)
                    .replace('{z}', (tileCoord[0] - 1).toString())
                    .replace('{x}', tileCoord[1].toString())
                    .replace('{y}', (-tileCoord[2] - 1).toString());
            },
            tileSize: 512
        }
    )
});


map.addLayer(layer0);

const layer = new VectorTileLayer({
    declutter: true,
    renderMode: "image",
    resolutions: resolutions,
    source: new VectorTileSource({
            format: new MVT(),
            projection: projection,
            tileUrlFunction: function (tileCoord) {
                return urlTemplate.replace('{z}', (tileCoord[0] - 1).toString())
                    .replace('{x}', tileCoord[1].toString())
                    .replace('{y}', (-tileCoord[2] - 1).toString());
            },
            tileLoadFunction: function (tile, url) {
                tile.setLoader(function () {
                    const zoom = tile.tileCoord[0];
                    const indexes = getTileLayerNames(zoom);
                    const features = [];
                    let count = 0;
                    const done = function (fs) {
                        count++;
                        if (!!fs) {
                            fs.forEach(a => features.push(a));
                        }
                        if (count == indexes.length) {
                            const format = tile.getFormat();
                            if (features.length > 0) {
                                tile.setFeatures(features, {});
                                tile.setExtent(format.getLastExtent());
                            }
                        }
                    };

                    indexes.forEach(a => {
                        fetchFeatures(url.replace("{index}", a), a, tile, done);
                    });

                    // fetchFeatures(url.replace("{index}", 13), tile, done);
                    // fetchFeatures(url.replace("{index}", 14), tile, done);
                    // fetchFeatures(url.replace("{index}", 16), tile, done);
                    // fetchFeatures(url.replace("{index}", 15), tile, done);
                    // fetchFeatures(url.replace("{index}", 12), tile, done);
                    // fetchFeatures(url.replace("{index}", 21), tile, done);
                    // fetchFeatures(url.replace("{index}", 22), tile, done);
                })
            },
            //
            // tileLoadFunction: function (tile, url) {
            //     tile.setLoader(function () {
            //         fetch(url.replace("{index}", 11)).then(function (response) {
            //             response.arrayBuffer().then(function (data) {
            //                 var format = tile.getFormat();
            //                 tile.setProjection(format.readProjection(data));
            //                 tile.setFeatures(format.readFeatures(data, {
            //                     // featureProjection is not required for ol/format/MVT
            //                     // featureProjection: map.getView().getProjection()
            //                 }));
            //                 // the line below is only required for ol/format/MVT
            //                 tile.setExtent(format.getLastExtent());
            //             });
            //         });
            //     })
            // },
            tileSize: 512
        }
    )
});

map.addLayer(layer);

fetch("http://10.18.1.185:80/api/v1/sprites/1/sprite.json").then(function (res) {
    res.json().then(function (sprites) {
        var styleUrl = "http://10.18.1.185/api/v1/styles/1";
        // styleUrl = "http://localhost:8080/map/api/v1/styles/5";
        fetch(styleUrl).then(function (response) {   //http://localhost:8089/egis/base/v1/wvts/styles/1
            response.json().then(function (glStyle) {
                stylefunction(layer0, glStyle, sources, resolutions, sprites,
                    "http://localhost:8080/map/api/v1/sprites/1/sprite.png");
                stylefunction(layer, glStyle, sources, resolutions, sprites,
                    "http://10.18.1.185:80/api/v1/sprites/1/sprite.png");
                applyBackground(map, glStyle);
                // view.setZoom(14);
                // view.setZoom(13);
            });
        });
    })
})


map.on("click", function (e) {
    var pixel = e.pixel;
    map.forEachFeatureAtPixel(pixel, function (feature) {
        console.log(feature)
    })
});

var eleLevel = document.getElementById("level");
var view = map.getView();
view.on("change:resolution", onResolutionChanged, this);

function onResolutionChanged() {
    eleLevel.innerHTML = view.getZoom();
}









