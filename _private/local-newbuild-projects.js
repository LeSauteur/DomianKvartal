// Only links to already published local project pages. No new prices or availability.
function key(value) {
  return String(value || '').toLowerCase().replaceAll('ё', 'е').replace(/^жк\s*/u, '').replace(/[^а-яa-z0-9]/gu, '');
}

function syncLocalProjects(items, projects) {
  for (const project of projects.filter(project => project.publish)) {
    const matches = items.filter(item => item.city === 'Аксай' && key(item.title) === key(project.name));
    if (matches.length > 1) throw new Error('Duplicate local project: ' + project.name);
    let item = matches[0];
    const localUrl = '/seo/zhk-' + project.slug + '-aksay.html';
    if (!item) {
      item = {
        id:'aksay-' + project.slug, slug:'aksay-' + project.slug, title:project.name,
        city:'Аксай', district:null, address:null, developer:null, class:null,
        status:null, deadline:null,
        price:{value:null, currency:'RUB', type:'on_request', verified:false, note:null},
        areas:{min:null, max:null, unit:'m2'}, description:null, features:[],
        official_url:null, checked_at:null, source_type:'site_page',
        cover:null, images:[], floorplans:[], detail_url:null, sources:[],
        completeness:{state:'needs_review', score:10, missing:['address','developer','status','description','official_url','checked_at','cover','gallery_3','detail_page']}
      };
      items.push(item);
    }
    item.local_detail_url = localUrl;
  }
  return items;
}

module.exports = { syncLocalProjects };
