// Article overrides preserve legacy records and URLs. Plain-text edits render
// through React, not HTML; untouched legacy article bodies stay in blog_posts.
function merge(base,article){
 if(!article)return base;
 if(!article.enabled)return null;
 if(!base&&article.body===null)return null;
 return {...base,...article,id:base?.id||`article:${article.slug}`,created_at:base?.created_at||article.date,
   content_text:article.body,read_time_min:article.body===null?base?.read_time_min:Math.max(1,Math.ceil(article.body.length/1000))};
}
function list(base,items=[]){
 const bySlug=new Map(base.map(post=>[post.slug,post]));
 for(const article of items){const post=merge(bySlug.get(article.slug),article);if(post)bySlug.set(article.slug,post);else bySlug.delete(article.slug);}
 return [...bySlug.values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
}
module.exports={merge,list};
