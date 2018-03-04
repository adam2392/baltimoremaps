import requests # Used for getting HTML
from bs4 import BeautifulSoup # Used for parsing HTML
import abc

class BaseScraper(abc.ABCMeta):
	# is the main PAGE_URL we are scraping
	requiredAttributes = ['PAGE_URL']

	def showparentdiv(self,divclass):
		parent_div = soup.find('div', attrs={
								'class': divclass
								})
		return parent_div

