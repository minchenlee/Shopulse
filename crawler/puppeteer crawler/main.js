// prevent puppeteer from being detected
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())
const worker = require('./utils/worker.js');

// Example queue of product URLs
const urlQueue = [
  "https://www.amazon.com/LG-42-Inch-Processor-AI-Powered-OLED42C3PUA/dp/B0BVXK9N6X?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-48-Inch-Class-OLED48C3PUA-Built/dp/B0BVXJ69F4?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Processor-AI-Powered-OLED55C3PUA/dp/B0BVXF72HV?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Processor-AI-Powered-OLED65C3PUA/dp/B0BVXDPZP3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-77-Inch-Class-OLED77C3PUA-Built/dp/B0BVX61P9B?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-83-Inch-Processor-AI-Powered-OLED83C3PUA/dp/B0BVX7D41W?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Processor-AI-Powered-OLED55G3PUA/dp/B0BVX2RLV2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Processor-AI-Powered-OLED65G3PUA/dp/B0BVWZJ2YV?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-77-Inch-Processor-AI-Powered-OLED77G3PUA/dp/B0BVWYRK3G?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-83-Inch-Processor-AI-Powered-OLED83G3PUA/dp/B0BVXCLQCJ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Class-OLED55B3PUA-Built/dp/B0BVXVLWV7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Class-OLED65B3PUA-Built/dp/B0BVXMG2WH?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-77-Inch-Class-OLED77B3PUA-Built/dp/B0BVXKMCK4?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-42-Inch-Refresh-AI-Powered-OLED42C2PUA/dp/B09RMFZZPX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-48-Inch-Refresh-AI-Powered-OLED48C2PUA/dp/B09RMHBXYX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Refresh-AI-Powered-OLED55C2PUA/dp/B09RMLLJPX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Refresh-AI-Powered-OLED65C2PUA/dp/B09RMRNSBF?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-77-Inch-Refresh-AI-Powered-OLED77C2PUA/dp/B09RMSPSK1?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-83-Inch-Refresh-AI-Powered-OLED83C2PUA/dp/B09RMKKFHS?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Refresh-AI-Powered-OLED55B2PUA/dp/B09RMND29B?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65QNED99UPA-Built-MiniLED-NanoCell/dp/B092LJTX5Q?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-86-Inch-Refresh-AI-Powered-86QNED85UQA/dp/B09RNCD1KP?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-75-Inch-Refresh-AI-Powered-75QNED85UQA/dp/B09RNDKMB3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Refresh-AI-Powered-65QNED85UQA/dp/B09RNCWLJZ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Refresh-AI-Powered-55QNED85UQA/dp/B09RNCDCTJ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-86-Inch-Processor-AI-Powered-86QNED80URA/dp/B0BVXJY7H2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-75-Inch-Processor-AI-Powered-75QNED80URA/dp/B0BVXB9W44?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Processor-AI-Powered-65QNED80URA/dp/B0BVX5L7WN?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-75-Inch-Bluetooth-Ethernet-AI-Powered/dp/B0BVWZKB6R?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-65-Inch-Bluetooth-Ethernet-AI-Powered/dp/B0BVXG2G5N?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Bluetooth-Ethernet-AI-Powered/dp/B0BVX2NQRX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-50-Inch-Bluetooth-Ethernet-AI-Powered/dp/B0BVXDQYQB?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-43-Inch-Bluetooth-Ethernet-AI-Powered/dp/B0BVXVML4N?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-UQ7590-86-Inch-86UQ7590PUD-Built/dp/B0BHKPG2NP?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-UHD-UQ75-75UQ7590PUB-2022/dp/B09RRKSZ29?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-UHD-UQ75-70UQ7590PUB-2022/dp/B09RRKTPBW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-55-Inch-Collection-55LX1QPUA-AUS-Built/dp/B0BC9TWWBH?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-48-Inch-Collection-48LX1QPUA-AUS-Built/dp/B0BGYRTZL2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-42-Inch-Bendable-Screen-42LX3QPUA/dp/B0BC9VYH21?ref_=ast_sto_dp",
  "https://www.amazon.com/LG-Signature-OLED-AI-Powered-OLED88Z2PUA/dp/B09RMHY7ZT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/LG-77-Inch-Refresh-AI-Powered-OLED77Z2PUA/dp/B09RMXJ98C?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Tracking-Q-Symphony-QN85Q80C/dp/B0BW4VBC7J?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-75-Inch-Tracking-Q-Symphony-QN75Q80C/dp/B0BW4T98KM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Q-Symphony-QN65Q80C/dp/B0BW4RP254?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Tracking-Q-Symphony-QN55Q80C/dp/B0BW4VHNWT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-50-Inch-Tracking-Q-Symphony-QN50Q80C/dp/B0BW4SWMPY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN85Q70C/dp/B0BVMY7GBT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN75Q70C/dp/B0BVMXKCRR?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN65Q70C/dp/B0BVMYL399?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN55Q70C/dp/B0BVMY858W?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN85Q60C/dp/B0BVMVXWCT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN75Q60C/dp/B0BVMYNNMS?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN70Q60C/dp/B0BVMZ7S52?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN65Q60C/dp/B0BVMVBBZT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN55Q60C/dp/B0BVMXZ32B?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN50Q60C/dp/B0BVMXYB92?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Q-Symphony-Xcelerator-QN43Q60C/dp/B0BVMW9CS7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Tracking-Enhancer-QN85Q80BAFXZA/dp/B09TQ4363K?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-75-Inch-Tracking-Enhancer-QN75Q80BAFXZA/dp/B09TQ3TWV7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Enhancer-QN65Q80BAFXZA/dp/B09TQ46KJL?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Tracking-Enhancer-QN55Q80BAFXZA/dp/B09VCT2QBB?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Infinity-Tracking-QN85QN900C/dp/B0BTMLMT8T?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-75-Inch-Infinity-Tracking-QN75QN900C/dp/B0BTMQCPRW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Infinity-Tracking-QN65QN900C/dp/B0BTMKGBGJ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Q-Symphony-QN65QN800C/dp/B0BTMMTY16?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Tracking-Q-Symphony-QN85QN800C/dp/B0BTMM1H2V?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN85QN90C/dp/B0BTTWBWTX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN75QN90C/dp/B0BTTVBDVD?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN65QN90C/dp/B0BTTWV394?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN55QN90C/dp/B0BTTVL419?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN50QN90C/dp/B0BTTVJPLG?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Anti-Glare-Q-Symphony-QN43QN90C/dp/B0BTTVZT1G?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Tracking-Xcelerator-QN85QN85C/dp/B0BTVCF5W3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-75-Inch-Tracking-Xcelerator-QN75QN85C/dp/B0BTTVL532?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Xcelerator-QN65QN85CAFXZA/dp/B0BTTTKQ1J?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Tracking-Xcelerator-QN55QN85CAFXZA/dp/B0BTTTGWKQ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Tracking-Xcelerator-QN85QN85BAFXZA/dp/B09SBGF5CC?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-75-Inch-Tracking-Xcelerator-QN75QN85BAFXZA/dp/B09SBFZCKV?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Xcelerator-QN75QN65BAFXZA/dp/B09SBH9Q36?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Tracking-Xcelerator-QN55QN65BAFXZA/dp/B09SBGRF6M?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Infinity-Tracking-QN85QN900BFXZA/dp/B09VCTXHB2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Tracking-Q-Symphony-QN65S90C/dp/B0BWFVBZM2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Tracking-Q-Symphony-QN55S90C/dp/B0BWFVCLG9?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-77-Inch-Tracking-Q-Symphony-QN77S90C/dp/B0BWFVJVTX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Symphony-Xcelerator-QN77S95CAFXZA/dp/B0BT52ZCYK?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Quantum-Tracking-QN65S95BAFXZA/dp/B09VHBLV4Y?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Quantum-Tracking-QN55S95BAFXZA/dp/B09VHBXY63?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-Tracking-Symphony-Xcelerator-QN65S95C/dp/B0BWFT262P?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-85-Inch-Terrace-Anti-Reflection-QN85LST9C/dp/B0CDJHH46Z?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-32-Inch-Anti-Reflection-Included-QN32LS03CB/dp/B0BWFWKWMY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Class-Serif-Built/dp/B0B3KZZG2B?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-55-Inch-Class-Serif-Built/dp/B0B3LKR1SP?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-65-Inch-Serif-Built-QN65LS01TAFXZA/dp/B098R6MN2R?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Samsung-Electronics-43-inch-Class-Built/dp/B086LKCLQL?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-43-Inch-Class-Serif-Built/dp/B0B3LFX99M?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Samsung-Class-Sero-QLED-Built/dp/B087T9ZZJM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Samsung-UN40N5200AFXZA-40-Inch-Assistant-Compatibility/dp/B07YXH57B8?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Samsung-Electronics-UN32N5300AFXZA-1080p-Smart/dp/B07CL4GLQW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Samsung-Electronics-UN32M4500BFXZA-720P-Smart/dp/B07DGCJ3KY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-PurColor-Q-Symphony-Upscaling-UN85CU7000/dp/B0BW13WL9R?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-PurColor-Q-Symphony-Upscaling-UN75CU7000/dp/B0BW12DXF9?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-PurColor-Q-Symphony-Upscaling-UN70CU7000/dp/B0BVZZXBQS?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-PurColor-Q-Symphony-Upscaling-UN65CU7000/dp/B0BW12GBSN?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/SAMSUNG-PurColor-Q-Symphony-Upscaling-UN58CU7000/dp/B0BVZW2H2C?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPLNZN4?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPNDTC7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPQ8RH8?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPVKW72?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-QD-OLED-inch-BRAVIA-Ultra/dp/B0BYPT328K?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-QD-OLED-inch-BRAVIA-Ultra/dp/B0BYPYRH4F?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-QD-OLED-inch-BRAVIA-Ultra/dp/B0BYPMMLTR?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-A90K-Playstation%C2%AE/dp/B09R8SDM9F?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X90L-Playstation%C2%AE/dp/B0C3FTV6DW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X90L-Playstation%C2%AE/dp/B0BYPLRJQF?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X90L-Playstation%C2%AE/dp/B0BYPNLKP4?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X90L-Playstation%C2%AE/dp/B0BYPLCFDS?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X90L-Playstation%C2%AE/dp/B0BYPLR5JQ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X77L-KD85X77L/dp/B0BZDXK2J7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X77L-KD75X77L/dp/B0BZF5B6SK?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X77L-KD65X77L/dp/B0BZFD9VQ8?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Mini-Ultra-X93L/dp/B0BYPPCTJK?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Mini-Ultra-X93L/dp/B0BYPSVKCZ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Mini-Ultra-X93L/dp/B0BYPQKQC3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Mini-Ultra-X95L/dp/B0BYPN76Z6?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-Z9K-Playstation%C2%AE/dp/B09R8WQ1YV?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-Z9K-Playstation%C2%AE/dp/B09R8YL21P?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X80K-KD85X80K/dp/B09RYKF6H4?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X80K-KD75X80K/dp/B09P4B3M4Z?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X85K-KD65X85K/dp/B09R8QS48V?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X85K-KD55X85K/dp/B09R9NT3FT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-X77L-KD50X77L/dp/B0BZFLK6WR?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Sony-Inch-Ultra-A90K-Playstation%C2%AE/dp/B09R8SDM9F?ref_=ast_sto_dp",
  "https://www.amazon.com/Sony-QD-OLED-inch-BRAVIA-Ultra/dp/B0BYPT328K?ref_=ast_sto_dp",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPQ8RH8?ref_=ast_sto_dp",
  "https://www.amazon.com/Sony-OLED-inch-BRAVIA-Ultra/dp/B0BYPNDTC7?ref_=ast_sto_dp",
  "https://www.amazon.com/TCL-98QM850G-Accelerator-Streaming-Television/dp/B0C1J56NSM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-85QM850G-Accelerator-Streaming-Television/dp/B0C1J4FKS2?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-75QM850G-Accelerator-Streaming-Television/dp/B0C1J6PP81?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-65QM850G-Accelerator-Streaming-Television/dp/B0C1J4MPBB?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Mini-LED-Vision-FreeSync-Premium/dp/B0B7ZZV4B3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Mini-LED-Vision-FreeSync-Premium/dp/B0B81GPGGW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Mini-LED-Vision-FreeSync-Premium/dp/B0B7ZXGCVY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Class-Mini-LED-Vision-Google/dp/B09QXZ8QR5?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Class-Collection-Vision-Google/dp/B09NLJ8ZZS?ref_=ast_sto_dp",
  "https://www.amazon.com/TCL-Class-Dolby-Vision-Smart/dp/B08WRBWQNB?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-43S350R-Compatible-Compatibility-Television/dp/B0C1J1GLCX?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-40S350R-Compatible-Compatibility-Television/dp/B0C1J1TWQM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-32S350R-Compatible-Compatibility-Television/dp/B0C1J1FS2C?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-43S350G-Assistant-Compatible-Television/dp/B0C1J1YCHL?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-40S350G-Assistant-Compatible-Television/dp/B0C1J3Z3YM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-32S350G-Assistant-Compatible-Television/dp/B0C1HZ9HCM?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-Class-Full-1080p-Smart/dp/B09YX4ZV4F?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/TCL-32S327-32-Inch-1080p-Smart/dp/B07F981R8M?ref_=ast_sto_dp",
  "https://www.amazon.com/Hisense-43-Inch-Google-43A4K-Built/dp/B0C7VKL13N?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-40-Inch-Google-40A4K-Built/dp/B0C7VBWHLQ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-32-Inch-Google-32A4K-Built/dp/B0C7VCGDB7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-43-Inch-Chromecast-Compatibility-43A4H/dp/B09WQPKTRY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-40-Inch-Chromecast-Compatibility-40A4H/dp/B09WQ3FQ2G?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-32-Inch-Chromecast-Compatibility-32A4FH/dp/B0BKH6CH8Z?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-32-Inch-Chromecast-Compatibility-32A4H/dp/B09WQPRMLF?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-43-Inch-Vision-Compatibility-43R6G/dp/B09ZQ6NQNR?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-58-inch-Quantum-Smart-58U6HF/dp/B0B7CLH7RW?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-55-Inch-Mini-LED-Google-55U8K/dp/B0C73H8PVT?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-55-Inch-Mini-LED-Google-55U7K/dp/B0C6XRRNM7?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-55-Inch-Mini-LED-Google-55U6K/dp/B0C6WLWQ5R?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-50-inch-Quantum-Smart-50U6HF/dp/B09WNJT9X3?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-Mini-LED-Compatibility-1500-nit-55U8H/dp/B0B5YZNZTZ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-55-Inch-Virtual-Chromecast-55A6H/dp/B09WQC4XJQ?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-50-Inch-Virtual-Chromecast-50A6H/dp/B09WQJPWWY?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-50-Inch-Vision-Compatibility-50R6G/dp/B09JHSVTSD?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-65-Inch-Mini-LED-Google-65U8K/dp/B0C73JDM1X?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-65-Inch-Mini-LED-Google-65U7K/dp/B0C6XSWTYC?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-65-Inch-Mini-LED-Google-65U6K/dp/B0C6XMCWBR?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-70-Inch-Google-Remote-70A6H/dp/B0B6LKJ46J?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-65-Inch-Virtual-Chromecast-65A6H/dp/B09WQRYD5N?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-Mini-LED-Compatibility-1500-nit-65U8H/dp/B0B5YZJD5V?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-65-Inch-Vision-Compatibility-65R6G/dp/B08PDTM9ZD?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-85-Inch-Mini-LED-Compatibility-2500-nit/dp/B0C31XRW5N?ref_=ast_sto_dp",
  "https://www.amazon.com/Hisense-100-Inch-Mini-LED-Google-100U8K/dp/B0CFRGQ7FN?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-85-Inch-Mini-LED-Google-85U8K/dp/B0CFRDNXHS?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-75-Inch-Mini-LED-Google-75U8K/dp/B0C73PVJ6N?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-85-Inch-Class-Mini-LED-Google/dp/B0CFRBMNRH?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-75-Inch-Mini-LED-Google-75U7K/dp/B0C6XSY45C?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-75-Inch-Mini-LED-Google-75U6K/dp/B0C6XMBLJL?ref_=ast_sto_dp&th=1&psc=1",
  "https://www.amazon.com/Hisense-85-Inch-Google-Remote-85A7H/dp/B0B7CPRRYJ?ref_=ast_sto_dp",
  "https://www.amazon.com/Hisense-75-Inch-Virtual-Chromecast-75A6H/dp/B09WQDRL83?ref_=ast_sto_dp&th=1&psc=1",
];

// Function to process URLs from the queue with a set number of concurrent workers
async function processQueue(urls, concurrentWorkers) {
  // 啟動瀏覽器
  // const browser = await puppeteer.launch({
  //   // headless: 'new',
  //   headless: 'false',
  //   // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // });  

  const promises = [];

  // 取得所有已經處理過的 product 的 amazonUrl
  const productInfo = fs.readFileSync('./result/productInfo.json', 'utf8');
  const productInfoJson = JSON.parse(productInfo);
  const keys = Object.keys(productInfoJson);  // 取得 productInfoJson 的所有 key
  const processedUrl = keys.map(key => productInfoJson[key].amazonUrl);  // 取得所有的 amazonUrl

  // Create a worker for each URL in the queue
  for (let i = 0; i < concurrentWorkers; i++) {
    const workerPromise = (async function() {
      while(urls.length > 0) {
        const url = urls.shift(); // Remove the URL from the queue

        // 檢查是否已經處理過
        let isProcessed = false;
        for (let i = 0; i < processedUrl.length; i++) {
          if (processedUrl[i] === url) {
            console.log(`============================`);
            console.log(`Worker ${i + 1} processing ${url}`);
            console.log(`Has been processed!!`);
            isProcessed = true;
            break;
          }
        }

        // 如果已經處理過，就跳過
        if (isProcessed) {
          continue;
        }

        if (url) {
          console.log(`============================`);
          console.log(`Worker ${i + 1} processing ${url}`);
          await worker(
            // browser, 
            url, 
            showProgress = false, 
            checkStealth = false, 
            saveTo = './result/productInfo.json'
          );
        }
      }
    })();
    promises.push(workerPromise);
  }

  await Promise.all(promises); // Wait for all workers to finish
}

// Start processing the queue with 1 workers
processQueue(urlQueue, 1).then(() => {
  console.log('All URLs have been processed.');
}).catch(error => {
  console.error('An error occurred:', error);
});

