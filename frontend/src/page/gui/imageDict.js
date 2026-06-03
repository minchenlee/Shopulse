// page/gui/imageDict.js — L6.1. The Gui.jsx module-level `imageDict` (29-38),
// extracted to a shared module so both Gui.svelte (Category data) and
// CategoryList/CategoryCard can resolve a category's image. In React this lived in
// the Gui.jsx closure; Svelte's one-component-per-file split makes a tiny shared
// module the faithful equivalent. Vite resolves each import to the asset URL exactly
// as the React build did.
import ledImage from '../../assets/screen_type/led-lcd.png'
import oledImage from '../../assets/screen_type/oled.png'
import qledImage from '../../assets/screen_type/qled.png'

import samsungImage from '../../assets/brand_logo/samsung-logo.svg'
import sonyImage from '../../assets/brand_logo/sony-logo.svg'
import lgImage from '../../assets/brand_logo/lg-logo.svg'
import tclImage from '../../assets/brand_logo/tcl-logo.svg'
import hisenseImage from '../../assets/brand_logo/hisense-logo.svg'

export const imageDict = {
  'led-lcd': ledImage,
  'oled': oledImage,
  'qled': qledImage,
  'samsung': samsungImage,
  'sony': sonyImage,
  'lg': lgImage,
  'tcl': tclImage,
  'hisense': hisenseImage,
}
