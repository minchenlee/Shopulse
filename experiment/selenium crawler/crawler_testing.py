import os
import asyncio
from dotenv import load_dotenv
from googlesearch import search
import requests
from bs4 import BeautifulSoup



async def fetch_page(url):
    # Placeholder for fetching a page; you'll replace this with actual fetching logic
    return requests.get(url)

async def process_url(url, parser, keyword):
    print(f"Fetching {url}")
    site = url.split('/')[2]

    try:
        response = await asyncio.wait_for(fetch_page(url), timeout=15)
        if response.status_code == 200:
            result = parser(response.text, url)
            write_to_file(result, f"./result/{keyword}/{site}.txt")

        else:
            print(f"Failed to fetch {url}: Status code {response.status_code}")
            print("-"*50)
            return

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        print("-"*50)
        

def parse_page_for_tv(html_content, url):
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        text_content_list = soup.find_all('p')
        # print(text_content_list)
        soup = BeautifulSoup(str(text_content_list), 'html.parser')
        text = soup.getText()
        text = clean_text(text)
        return text
    
    except Exception as e:
        print(f"Error parsing {url}: {e}")
        print("-"*50)


def clean_text(text):
    text = text.split('\n')

    # remove unwanted string
    text = [x.strip() for x in text]
    text = [x for x in text if x != '']
    text = [x for x in text if x != ' ']
    text = [x for x in text if x != "\n"]
    text = [x for x in text if x != ", "]
    text = [x for x in text if x != ","]
    text = [x for x in text if x != "'"]

    merged_text = '\n'.join(text)
    merged_text = merged_text.replace('\t', '')
    merged_text = merged_text.replace(', ', '')

    return merged_text


def write_to_file(text, file_name):
    try:
        # extract dir name
        dir_name = os.path.dirname(file_name)
        if not os.path.exists(dir_name):
            os.makedirs(dir_name)

        if text is None:
            print("No text to write")
            return
        
        with open(file_name, 'w') as f:
            f.write(text)
    
    except Exception as e:
        print(f"Error writing to {file_name}: {e}")
        print("-"*50)

def gather_by_keyword(keyword, num_results=2):
    url_list = search(keyword, num_results=num_results)
    url_list = list(url_list)

    async def async_run():
        # create async task
        tasks = [process_url(url, parser=parse_page_for_tv, keyword=keyword) for url in url_list]
        await asyncio.gather(*tasks)

    asyncio.run(async_run())


# sum all txt in result folder
def concact_txt(keyword):
    count = 0
    text = ""
    for file in os.listdir(f"./result/{keyword}"):
        # only concant txt file
        if not file.endswith(".txt"):
            continue

        with open(f"./result/{keyword}/{file}", 'r') as f:
            text += f.read()
            count += 1

    return text


# save all txt in result folder to one txt
def concact_and_save(keyword, concant_num=5):
    text = concact_txt(keyword)
    write_to_file(text, f"./result/{keyword}/sum_result.txt")


gather_by_keyword("如何挑選電視？", num_results=2)
concact_and_save("如何挑選電視？", 2)