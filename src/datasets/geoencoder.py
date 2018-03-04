import requests, json
import csv
from base import BaseDataset
''' 

API FOR Census Geo Encoding API: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf
'''

# street = "1600 NW Pennsylvania Ave"
# city = "Washington DC"
# state = "DC"

class GeoEncoder(BaseDataset):
	def __init__(self, returntype="geographies", searchtype="address"):
		if returntype not in ['locations', 'geographies']:
			print('Return type for batch processing does not support %s' % returntype)


		# for sending HTTP: single address conversion
		base_url = os.path.join("http://geocoding.geo.census.gov/geocoder/",returntype, searchtype) 
		self.base_url = base_url

		# for sending batch HTTP: batch address conversion

		batch_url = os.path.join("https://geocoding.geo.census.gov/geocoder/", returntype, "addressbatch")
		self.batch_url = batch_url

	def batch_get_fips_from_address(self, addressfile, benchmark=None, vintage=None):
		''' 
		Data of csv file format must be:
		Unique ID, Street address, City, State, ZIP

		@params:
		returntype – locations (to get just geocoding response) or geographies (to get geocoding
					 response as well as geoLookup). 

		benchmark – A numerical ID or name that references what version of the locator should be
					searched. This generally corresponds to MTDB data which is benchmarked twice yearly. A full
					list of options can be accessed at https://geocoding.geo.census.gov/geocoder /benchmarks.
					The general format of the name is DatasetType_SpatialBenchmark. The valid values for these
					include:
					* DatasetType
						- Public_AR
					* SpatialBenchmark
						- Current
						- ACS2017
						- Census2010

					So a resulting benchmark name could be “Public_AR_Current”, “Public_AR_Census2010”, etc.
					Over time, there will always be a “Current” benchmark. It will change as the underlying dataset
					changes.
		vintage – a numerical ID or name that references what vintage of geography is desired for
					the geoLookup (only needed when returntype = geographies). ). 
					
					A full list of options for a given benchmark can be accessed at
					https://geocoding.geo.census.gov/geocoder/vintages?benchmark=benchmarkId. 

					The general format of the name is GeographyVintage_SpatialBenchmark. The SpatialBenchmark variable
					should always match the same named variable in what was chosen for the benchmark
					parameter. The GeographyVintage can be Current, ACS2017, etc. So a resulting vintage name
					could be “ACS2017_Current”, “Current_Census2010”, etc. Over time, there will always be a
					“Current” vintage. It will change as the underlying dataset changes.

		addressFile – An input of type “file” containing the addresses to be coded
		'''
				# if benchmark not in ['']:
		# if vintage not in ['']:
		if vintage is None:
			vintage = 'ACS2013_Current'
		if benchmark is None:
			benchmark = 'Public_AR_Current'

		payload = {'addressFile': addressfile,
	    		   'benchmark': benchmark, 
	    		   'vintage': vintage, 
	    		   'format':'json'}

		r = requests.get(self.batch_url, params=payload)
		return r

	def serial_get_fips_from_address(self, street, city, state):
	    payload = {'street': street, 
	    		   'city': city, 
	    		   'state': state, 
	    		   'benchmark': 'Public_AR_Current', 
	    		   'vintage':'ACS2013_Current', 
	    		   'format':'json'}

	    r = requests.get(self.base_url, params=payload)
	    json_data = json.loads(r.text)
	    
	    fips = json_data['result']['addressMatches'][0]['geographies']['Census Tracts'][0]['GEOID']
	    return str(fips)


