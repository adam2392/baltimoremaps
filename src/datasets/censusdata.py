from base import BaseDataset

import geopandas as gpd
import pandas as pd
import us
import requests
import zipfile
import os

import math
import numpy as np
from census import Census
import warnings

class CensusData(BaseDataset):
    def __init__(self, year, CENSUS_API, states=None):
        self.year = year

        self.API = CENSUS_API
        # 'fe55211c8b3f0350fcb040c07321a129a3d6e266'

        print("If setting year, make sure that the census api has data for that year!")
        c = Census(CENSUS_API, year=self.year) # Initialize census class with API key
        self.c = c

        # types of directory data
        # Local Storage Parameters
        self.LOCAL_DATA_DIR = './data/census/'
        self.ATTR_FILE_END = '_census_data.csv'
        
        # # create geo json file
        # self.county_list = county_list # Extract all counties

        if states is None:
            self.states = us.STATES
        else:
            self.states = states

        ''' Use the  https://www2.census.gov/programs-surveys/acs/summary_file/2016/documentation/tech_docs/2016_SummaryFile_Tech_Doc.pdf 
        file to determine the table IDs we want, for the data we want.
        '''
        # Generate codes for census variables of interest
        # self.var_ids = []
        # var_ids.extend(["B19001_0{:02d}E".format(x) for x in range(2, 18)]) # Household income over 12 months
        # self.var_ids.extend(["B19037_0{:02d}E".format(x) for x in range(1, 70)]) # Household income over 12 months by age

        self._getfips()
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

    def _outputfile(self):
        self.attr_outfile = os.path.join(self.LOCAL_DATA_DIR, loc_name +  ATTR_FILE_END)

    def build_tract_fips(self, record):
        fips_code = record['state'] + record['county'] + record['tract']
        return str(fips_code)

    def getdatachunks(self, state_id, num_chunks, var_sublists, county_id=None):
        # loop over chunks of the data we need
        for chunk_num in range(0, num_chunks):
            census_data = []                # initialize list to store these census data

            # get the variables sublisted by np.array_split
            var_sublist = var_sublists[chunk_num].tolist()


            print('state:{0} county:{1}'.format(state_id, county_id))

            if county_id is None:
                # get the census ACS data - tracts in state
                census_data = self.c.acs.get(var_sublist, \
                                    {'for': 'tract:*', \
                                    'in': 'state:{0}'.format(str(state_id)),
                                    })
            else:
                # get the census ACS data - tracts in state&county
                census_data = self.c.acs.get(var_sublist, \
                                    {'for': 'tract:*', \
                                    'in': 'state:{0} county:{1}'.format(str(state_id), str(county_id)),
                                    })
            
            print("Got {0} records.".format(len(census_data)))
            # go through each record of the census data
            for idx, record in enumerate(census_data):
                # print(census_data)
                # break
                # Build fips codes
                fips_code = self.build_tract_fips(record)
                
                # Eliminate original code components
                key_list = ['state', 'tract']
                for key in key_list:
                    if key in record: 
                        del record[key]
                
                # add data for this fips code
                if fips_code in self.census_dict:
                    self.census_dict[fips_code].update(record)
                else:
                    self.census_dict[fips_code] = record

    def get_state_tracts(self, num_chunks, var_sublists):
        # loop over states
        for state_id in self.state_codes:
            print("State: {0}".format(state_id))
            
            if self.county_codes is not None:
                self.get_county_tracts(state_id, num_chunks, var_sublists)
            else:
                self.getdatachunks(state_id, num_chunks, var_sublists)

    def get_county_tracts(self, state_id, num_chunks, var_sublists):
        # loop over counties
        for county_id in self.county_codes:
            print("County: {0}".format(county_id))
            self.getdatachunks(state_id, num_chunks, var_sublists, county_id)

    def census_tracts_to_dataframe(self, var_list, state_codes, county_codes=None):
        CALL_LIM = 30 # Can only request 50 records at a time

        assert isinstance(state_codes, list)
        self.state_codes = state_codes
        self.county_codes = county_codes
        self.census_dict = dict()

        # initialize the census dictionary
        census_dict = {}

        # number of chunks for the variable list of table data, we can request at a time
        num_chunks = int(math.ceil(1.0 * len(var_list) / CALL_LIM))
        var_sublists = np.array_split(var_list, num_chunks)

        self.get_state_tracts(num_chunks, var_sublists)                
                
        # convert census data to dataframe with index as fips
        census_df = pd.DataFrame(self.census_dict)
        census_df = census_df.transpose()
        census_df.index.name = "fips"
        self.census_df = census_df

    def savedata(self, outputfile):
        self.census_df.to_csv(outputfile) # Write to csv

    def loaddata(self):
        pass
