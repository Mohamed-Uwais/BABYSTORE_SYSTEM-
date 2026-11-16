let facetSelection={}, studioCategory='Diapers';
function readFilters(){return {category:$('#category').value,min:$('#minPrice').value,max:$('#price').value,available:$('#available').value,attributes:facetSelection};}
function syncCategories(){
  const old=$('#category').value;
  $('#category').innerHTML='<option value="">All collections</option>'+view.categories.map(c=>`<option>${safe(c.name)}</option>`).join('');
  $('#category').value=view.categories.some(c=>c.name===old)?old:'';
  facetSelection={};renderFacets();
}
function renderFacets(){
  const cat=view.categories.find(c=>c.name===$('#category').value);
  $('#categoryFacets').innerHTML=(cat?.attributes||[]).map(a=>`<fieldset><legend>${safe(a.label)}</legend>${a.options.map(o=>`<label><input type="checkbox" data-facet="${safe(a.key)}" value="${safe(o)}" ${(facetSelection[a.key]||[]).includes(o)?'checked':''}> ${safe(o)}</label>`).join('')}</fieldset>`).join('');
  $('#categoryFacets').querySelectorAll('input').forEach(el=>el.onchange=()=>{facetSelection[el.dataset.facet]=[...$('#categoryFacets').querySelectorAll('input:checked')].filter(i=>i.dataset.facet===el.dataset.facet).map(i=>i.value);render()});
}
function assignmentEditor(p){
  const cat=draft.categories.find(c=>c.name===p.category);
  return `<h3>Category & filter assignments</h3><label>Product category<select id="assignmentCategory">${draft.categories.map(c=>`<option ${c.name===p.category?'selected':''}>${safe(c.name)}</option>`).join('')}</select></label>`+(cat?.attributes||[]).map(a=>`<label>${safe(a.label)}<select data-assignment="${safe(a.key)}"><option value="">Not assigned</option>${a.options.map(o=>`<option ${String(CatalogDemo.value(p,a.key))===o?'selected':''}>${safe(o)}</option>`).join('')}</select></label>`).join('');
}
function categoryEditor(){
  if(!draft.categories.some(c=>c.name===studioCategory))studioCategory=draft.categories[0].name;
  const cat=draft.categories.find(c=>c.name===studioCategory);
  return `<p class="status">Working browser-local demonstration: create a category, add filter attributes/options, assign products, then preview or publish in demo. No live POS records change.</p>
  <label>Manage category<select id="studioCategory">${draft.categories.map(c=>`<option ${c.name===studioCategory?'selected':''}>${safe(c.name)}</option>`).join('')}</select></label>
  <form id="addCategory"><label>New category name<input name="categoryName" required maxlength="60"></label><button>Add category</button></form>
  <h3>${safe(cat.name)} filters</h3>${cat.attributes.map(a=>`<label>${safe(a.label)} — available options, separated by commas<textarea data-options="${safe(a.key)}">${safe(a.options.join(', '))}</textarea></label>`).join('')}
  <form id="addAttribute"><label>New filter attribute name<input name="attributeName" required maxlength="60"></label><label>Available options, separated by commas<input name="attributeOptions" required></label><button>Add filter attribute</button></form>
  <p class="muted">Routine category, attribute and option additions are configuration. Assign options under Products. Price and availability are built-in filters. Removing assigned options is blocked in this demo; production will offer a migration/reassignment workflow.</p><p id="categoryStatus" role="status"></p>`;
}
function dirty(){ $('#saveStatus').textContent='Unpublished draft · preview before publishing'; }
function bindCategoryEditor(){
  const split=s=>[...new Set(s.split(',').map(v=>v.trim()).filter(Boolean))];
  $('#studioCategory')?.addEventListener('change',e=>{studioCategory=e.target.value;edit()});
  $('#addCategory')?.addEventListener('submit',e=>{e.preventDefault();const name=e.target.elements.categoryName.value.trim();if(!name||draft.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){$('#categoryStatus').textContent='Enter a unique category name.';return}draft.categories.push({name,attributes:[]});studioCategory=name;dirty();edit()});
  $('#addAttribute')?.addEventListener('submit',e=>{e.preventDefault();const label=e.target.elements.attributeName.value.trim(), options=split(e.target.elements.attributeOptions.value),cat=draft.categories.find(c=>c.name===studioCategory);if(!label||!options.length||cat.attributes.some(a=>a.label.toLowerCase()===label.toLowerCase())){$('#categoryStatus').textContent='Enter a unique attribute name and at least one option.';return}cat.attributes.push({key:'custom_'+Date.now(),label,options});dirty();edit()});
  $('#editor').querySelectorAll('[data-options]').forEach(el=>el.onchange=()=>{const cat=draft.categories.find(c=>c.name===studioCategory),a=cat.attributes.find(a=>a.key===el.dataset.options),options=split(el.value);const removed=a.options.filter(v=>!options.includes(v));if(!options.length||draft.products.some(p=>p.category===cat.name&&removed.includes(String(CatalogDemo.value(p,a.key))))){$('#categoryStatus').textContent='Keep at least one option. Reassign products before removing an option they use.';el.value=a.options.join(', ');return}a.options=options;dirty()});
  $('#assignmentCategory')?.addEventListener('change',e=>{const p=draft.products.find(p=>p.id===selected);p.category=e.target.value;p.attributes={};p.size='';p.age='';p.brand='';dirty();edit()});
  $('#editor').querySelectorAll('[data-assignment]').forEach(el=>el.onchange=()=>{const p=draft.products.find(p=>p.id===selected),key=el.dataset.assignment;if(['brand','size','age'].includes(key))p[key]=el.value;else{p.attributes||={};p.attributes[key]=el.value}dirty()});
}
