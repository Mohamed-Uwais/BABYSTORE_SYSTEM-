/* Prototype-only catalogue configuration. Production will persist stable IDs in POS. */
const CatalogDemo = {
  categories: [
    {name:'Diapers', attributes:[
      {key:'brand',label:'Brand',options:['Pretty Baby','GLOBAL II','Mum & Me']},
      {key:'size',label:'Size',options:['NB','S','M','L','XL','XXL']},
      {key:'type',label:'Tape / pant type',options:['Tape','Pant']},
      {key:'pieces',label:'Pieces per pack',options:['16','25','30','60']}]},
    {name:'Wet wipes', attributes:[
      {key:'brand',label:'Brand',options:['Pretty Baby']},
      {key:'fragrance',label:'Fragrance',options:['Unscented','Lightly scented']},
      {key:'pieces',label:'Wipes per pack',options:['40','80','100']}]},
    {name:'Toys', attributes:[
      {key:'type',label:'Toy type',options:['Die-cast','Electric','Toy guns','Stacking & learning']},
      {key:'age',label:'Age group',options:['0–2 years','3+ years','6+ years']},
      {key:'brand',label:'Brand',options:['Little Play']},
      {key:'power',label:'Power source',options:['No batteries','Battery','Rechargeable']}]},
    {name:'Flowers and décor', attributes:[
      {key:'type',label:'Décor type',options:['Bouquets','Hanging flowers','Flower vases','Bonsai','Baskets']},
      {key:'colour',label:'Colour',options:['Natural','White','Pink','Green']},
      {key:'material',label:'Material',options:['Woven fibre','Ceramic','Fabric','Plastic']},
      {key:'use',label:'Use',options:['Indoor','Outdoor','Both']} ]}
  ],
  value(product,key){return product.attributes?.[key] ?? product[key] ?? '';},
  filter(products, state){
    return products.filter(p=>(!state.category||p.category===state.category)
      &&(state.min===''||p.price>=Number(state.min))
      &&(state.max===''||p.price<=Number(state.max))
      &&(!state.available||p.stock>0)
      &&Object.entries(state.attributes||{}).every(([key,options])=>!options.length||options.includes(String(this.value(p,key)))));
  }
};
