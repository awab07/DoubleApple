import api from './client'

// The Product collection is shared with Triple Buzz, distinguished only by
// `site` — every listing call here must pass it, or results would include
// Triple Buzz's (much larger, Lightspeed-synced) catalogue too.
//
// `imagesFirst` asks the backend to list products that have a photo before
// the ones that don't (newest first within each group). Without it, a POS sync
// that adds a batch of photo-less products makes those the "newest" and any
// caller taking the first product of a category gets one with no image.
export function getProducts({ page, limit, category, search, site = 'doubleapple', imagesFirst } = {}) {
  return api
    .get('/Product/allproducts', {
      params: { page, limit, category, search, site, imagesFirst: imagesFirst ? true : undefined },
    })
    .then((r) => r.data)
}

export function getProductById(id) {
  return api.get(`/Product/${id}`).then((r) => r.data)
}
