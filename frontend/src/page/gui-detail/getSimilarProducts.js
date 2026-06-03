// page/gui-detail/getSimilarProducts.js — L6.2. The GuiProductDetail.jsx module helper
// getSimilarProducts (505-533), lifted verbatim. Pure async; fetches products in a
// ±15% price/screen-size band of the current product, re-keys _id→productId, filters
// the current product out, and caps the list at 4 (pops the 5th). Carried unchanged.
import { fetchData } from '../../lib/api.js'

export const getSimilarProducts = async (productData, productId) => {
  let price = productData.productPrice
  let screenSize = parseInt(productData.productShortSpec['Screen Size'])
  let screenType = productData.productShortSpec['Display Technology']

  const minScreenSize = parseInt(screenSize - screenSize * 0.15)
  const maxScreenSize = parseInt(screenSize + screenSize * 0.15)

  const minPrice = parseInt(price - price * 0.15)
  const maxPrice = parseInt(price + price * 0.15)

  let similarProducts = await fetchData(`/products/filter?minPrice=${minPrice}&maxPrice=${maxPrice}&minScreenSize=${minScreenSize}&maxScreenSize=${maxScreenSize}&screenType=${screenType}&limit=5&fullDetails=false`)

  // Convert the product._id to product.productId
  similarProducts = similarProducts.map((product) => {
    product.productId = product._id
    return product
  })

  // Filter out the current product
  similarProducts = similarProducts.filter((product) => product.productId !== productId)

  // After filtering, if there are 5 similar products, reduce to 4
  if (similarProducts.length === 5) {
    similarProducts.pop()
  }

  return similarProducts
}
