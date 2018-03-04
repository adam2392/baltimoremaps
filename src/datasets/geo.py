from base import BaseDataset

import geopandas as gpd
import pandas as pd
import us
import requests
import zipfile
import os

class GeoShapes(BaseDataset):
    def __init__(self, year, states=None, county_list=None):
        self.year = year
        TIGER_BASE_URL = 'http://www2.census.gov/geo/tiger/TIGER'
        self.TIGER_BASE_URL = TIGER_BASE_URL + str(self.year)

        # types of directory data
        self.TIGER_TRACT_DIR = 'TRACT/'

        # Local Storage Parameters
        self.LOCAL_DATA_DIR = './data/'
        self.GEO_SUB_DIR = 'geozip/'
        self.GEO_DIR = 'geo'

        # # create geo json file
        self.county_list = county_list # Extract all counties
        # GEO_FILE_END = '_geo_data.json'
        # geo_outfile = lambda state_id: os.path.join(LOCAL_DATA_DIR, state_id + GEO_FILE_END)

        if states is None:
            self.states = us.STATES
        else:
            self.states = states

        self._getfips()

    def _gettigerurl(self, state_id):
        # FULL TIGER URL
        gettigerurl = lambda tiger_zip_file: os.path.join(self.TIGER_BASE_URL, self.TIGER_TRACT_DIR, tiger_zip_file)
        return gettigerurl(state_id)

    def _gettigerzipfile(self, state_id):
        gettigerzipfile = lambda state_id: 'tl_' + str(self.year) + '_{0}_tract.zip'.format(state_id)
        return gettigerzipfile(state_id)

    def _gettigershapefile(self, state_id):
        gettigershapefile = lambda state_id: 'tl_' + str(self.year) + '_{0}_tract.shp'.format(state_id)
        return gettigershapefile(state_id)

    def _getfips(self):
        # initialize list to store all the fips codes
        state_fips = []
        # loop through states
        for idx,state in enumerate(self.states):
            # get the abbbreviation of this state
            state_abbrv = self.us_state_abbrev[str(state)]
            
            ''' get fips using mapping '''
            fips_mapping = us.states.mapping('abbr', 'fips')
            state_fips.append(fips_mapping[state_abbrv])
        self.state_fips = state_fips

    def _getlocaltigerfile(self, tiger_zip_file):
        localtigerfile = lambda tiger_zip_file: os.path.join(self.LOCAL_DATA_DIR, \
                                                        self.GEO_SUB_DIR, tiger_zip_file)

        return localtigerfile(tiger_zip_file)
    def _getlocalshapefile(self, tiger_shape_file):
        localshapefile = lambda tiger_shape_file: os.path.join(self.LOCAL_DATA_DIR, \
                                                self.GEO_DIR, tiger_shape_file)
        return localshapefile(tiger_shape_file)

    def loadtractbyfips(self):
        # FIPS county code. The Federal Information Processing Standard Publication 6-4 (FIPS 6-4)
        # load data by this FIPS code
        state_shapes = []

        # download the state tiger-tract file by year 
        for state_id in self.state_fips:
            tiger_zip_file = self._gettigerzipfile(state_id)
            tiger_shape_file = self._gettigershapefile(state_id)
            FULL_TIGER_URL = self._gettigerurl(tiger_zip_file)

            print(us.states.lookup(state_id), FULL_TIGER_URL)
            
            # Check if file is in directory, else download it
            if os.path.isfile(self._getlocaltigerfile(tiger_zip_file)):
                print("Already had the file.  Great.")
            else:
                r = requests.get(FULL_TIGER_URL)

                if r.status_code == requests.codes.ok:
                    print("Got the file! Copying to disk.")
                    with open(self._getlocaltigerfile(tiger_zip_file), "wb") as f:
                        f.write(r.content)
                else:
                    print("Something went wrong. Status code: {0}".format(r.status_code))
                    
            # Unzip file, extract contents
            zfile = zipfile.ZipFile(self._getlocaltigerfile(tiger_zip_file))
            zfile.extractall(os.path.join(self.LOCAL_DATA_DIR, self.GEO_DIR))

            # Load to GeoDataFrame
            state_shape = gpd.GeoDataFrame.from_file(self._getlocalshapefile(tiger_shape_file))
            state_shapes.append(state_shape)
        self.state_shapes = state_shapes

    def convertgpdtojson(self):
        shapes = gpd.GeoDataFrame(pd.concat(self.state_shapes, ignore_index=True) )

        # Only keep counties that we are interested in
        if self.county_list is not None:
            print("removing counties")
            shapes = shapes[shapes["COUNTYFP"].isin(self.county_list)]
            
        small_shapes = gpd.GeoDataFrame()
        small_shapes["geometry"] = shapes["geometry"].simplify(tolerance=0.0001) # Simplify geometry to reduce file size
        small_shapes["fips"] = shapes["GEOID"]
        self.small_json = small_shapes.to_json()

    def loaddata(self):
        print(us.states.WY.fips)
        pass
