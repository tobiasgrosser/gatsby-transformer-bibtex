import { URL } from 'url';
import { parseBibFile } from 'bibtex';
import _ from 'lodash';

String.prototype.replaceAll = function (search, replacement) {
  return this.replace(new RegExp(search, 'g'), replacement);
}

function getYoutubeId(ytstring) {
  if (ytstring) {
    let is_link = ytstring.includes("youtube.com");
    let id = null;
    if (is_link) {
      let url = new URL(ytstring);
      id = url.searchParams.get('v');
    } else {
      id = ytstring // if it's not a link we're assuming it's the id
    }
    return id
  } else {
    return null
  }
}

function cleanAccents(str) {
  return str
          .replaceAll("\\\\'e", "é")
          .replaceAll("\\\\ss", "ß")
          .replaceAll("\\\\\"A", "Ä")
          .replaceAll("\\\\\"a", "ä")
          .replaceAll("\\\\\"E", "Ë")
          .replaceAll("\\\\\"e", "ë")
          .replaceAll("\\\\\"O", "Ö")
          .replaceAll("\\\\\"o", "ö")
          .replaceAll("\\\\\"U", "Ü")
          .replaceAll("\\\\\"u", "ü")
          .replaceAll("\\\\'c", "ć")
          .replaceAll("\\\\'E", "É")
          .replaceAll(",", " ")
}

function jsonOfEntry(entry) {
  const authors = _.map(entry.getAuthors().authors$, (auth, _) => auth.firstNames + " " + auth.lastNames);
  const date = entry.getFieldAsString('issue_date') ? entry.getFieldAsString('issue_date') : entry.getFieldAsString('year');
  return {
    title: entry.getFieldAsString('title'),
    file: entry.getFieldAsString('file'),
    slides: entry.getFieldAsString('slides'),
    abstract: entry.getFieldAsString('abstract'),
    authors: authors.map(cleanAccents).map(x => x.trim()),
    url: entry.getFieldAsString('url'),
    doi: entry.getFieldAsString('doi'),
    youtubeId: getYoutubeId(entry.getFieldAsString('youtube')),
    date : date.toString(),
    journal: entry.getFieldAsString('journal')
  }
}

async function onCreateNode(
    { node, actions, loadNodeContent, createNodeId, createContentDigest },
    // options
  ) {
    const { createNode, createParentChildLink } = actions
    if (node.extension !== `bib`) {
      return
    };
    // Load CSV contents
    const content = await loadNodeContent(node);
    // Parse
    const bib = parseBibFile(content);
    const keys = Object.keys(bib.entries$);
    const onlyFieldsWithKey = _.map(keys, (key) => { 
      const obj = jsonOfEntry(bib.getEntry(key));
      obj.key = key;
      return obj
     });
    if (_.isArray(onlyFieldsWithKey)) {
      const bibArray = onlyFieldsWithKey.map((ref) => {
        return {
          ...ref,
          id: createNodeId(`${node.id} ${ref.key} >>> BIBTEX`),
          children: [],
          parent: node.id,
          internal: {
            contentDigest: createContentDigest(ref),
            type: _.upperFirst(_.camelCase(`Reference`)),
          },
        }
      })
      _.each(bibArray, y => {
        createNode(y)
        createParentChildLink({ parent: node, child: y })
      })
    }
  
    return
  }

exports.onCreateNode = onCreateNode;
