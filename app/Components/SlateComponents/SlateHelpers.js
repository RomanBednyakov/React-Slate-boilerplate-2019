import React from "react";
import styled from "react-emotion";
import marked from "marked";
import imageExtensions from "image-extensions";
import { Block } from "slate";
import { isKeyHotkey } from "is-hotkey";

const Image = styled("img")`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? "0 0 0 2px blue;" : "none")};
`;
const schema = {
  document: {
    last: { type: "paragraph" },
    normalize: (editor, { code, node, child }) => {
      if (code === "last_child_type_invalid") {
        const paragraph = Block.create("paragraph");
        return editor.insertNodeByKey(node.key, node.nodes.size, paragraph);
      }
    }
  },
  blocks: {
    image: {
      isVoid: true
    }
  }
};
const isBoldHotkey = isKeyHotkey("mod+b");
const isItalicHotkey = isKeyHotkey("mod+i");
const isUnderlinedHotkey = isKeyHotkey("mod+u");
const isCodeHotkey = isKeyHotkey("mod+`");

function deleteAllTagHtml(content) {
  if (!content) {
    return "";
  }
  content = content
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "");
  return content;
}

function renderNode(props, editor, next) {
  const { attributes, children, node, isFocused } = props;

  switch (node.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    case "center":
      return <center {...attributes}>{children}</center>;
    case "image": {
      const src = node.data.get("src");
      return <Image src={src} selected={isFocused} {...attributes} />;
    }
    case "link": {
      const { data } = node;
      const href = data.get("href");
      return (
        <a {...attributes} href={href}>
          {children}
        </a>
      );
    }

    default:
      return next();
  }
}

function renderMark(props, editor, next) {
  const { children, mark, attributes } = props;

  switch (mark.type) {
    case "bold":
      return <strong {...attributes}>{children}</strong>;
    case "code":
      return <code {...attributes}>{children}</code>;
    case "italic":
      return <em {...attributes}>{children}</em>;
    case "underlined":
      return <u {...attributes}>{children}</u>;
    case "strikethrough":
      return <strike {...{ attributes }}>{children}</strike>;
    case "title": {
      return (
        <span
          {...attributes}
          style={{
            fontWeight: "bold",
            fontSize: "20px",
            margin: "20px 0 10px 0",
            display: "inline-block"
          }}
        >
          {children}
        </span>
      );
    }

    case "punctuation": {
      return (
        <span {...attributes} style={{ opacity: 0.2 }}>
          {children}
        </span>
      );
    }

    case "list": {
      return (
        <span
          {...attributes}
          style={{
            paddingLeft: "10px",
            lineHeight: "10px",
            fontSize: "20px"
          }}
        >
          {children}
        </span>
      );
    }

    case "hr": {
      return (
        <span
          {...attributes}
          style={{
            borderBottom: "2px solid #000",
            display: "block",
            opacity: 0.2
          }}
        >
          {children}
        </span>
      );
    }

    default:
      return next();
  }
}

function convertMarkdownSlate(content, flag) {
  if (!content) {
    return "";
  }
  content = content
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  let loadMarkdown = whitelist => {
    let lexer = (marked, whitelist) => {
      let list = [
        "code",
        "blockquote",
        "html",
        "heading",
        "center",
        "hr",
        "list",
        "listitem",
        "paragraph",
        "table",
        "tablerow",
        "tablecell",
        "strong",
        "em",
        "codespan",
        "br",
        "del",
        "link",
        "image",
        "text"
      ];
      let blacklist = list.filter(item => {
        return whitelist.indexOf(item) < 0;
      });
      let lexer = new marked.Lexer();
      for (let i in blacklist) {
        let key = blacklist[i];
        if (!lexer.rules[key]) continue;
        lexer.rules[key].exec = () => {}; // noop
      }
    };
    marked.lexer = lexer(marked, whitelist);

    return marked;
  };
  let markedSlate = loadMarkdown([
    "paragraph",
    "text",
    "br",
    "em",
    "list",
    "listitem",
    "strong"
  ]);
  let newContent = markedSlate(content, { silent: true, sanitize: false });
  return flag ? newContent.slice(3, newContent.length - 5) : newContent;
}

function wrapLink(editor, href) {
  editor.wrapInline({
    type: "link",
    data: { href }
  });

  editor.moveToEnd();
}

function unwrapLink(editor) {
  editor.unwrapInline("link");
}

function isImage(url) {
  return !!imageExtensions.find(url.endsWith);
}

function insertImage(editor, src, target) {
  if (target) {
    editor.select(target);
  }
  editor.insertBlock({
    type: "image",
    data: { src }
  });
}

function getType(chars) {
  switch (chars) {
    case "*":
    case "-":
    case "+":
      return "list-item";
    case ">":
      return "block-quote";
    case "#":
      return "heading-one";
    case "##":
      return "heading-two";
    case "###":
      return "heading-three";
    case "####":
      return "heading-four";
    case "#####":
      return "heading-five";
    case "######":
      return "heading-six";
    default:
      return null;
  }
}

async function addToOnchange(_this, helper, item) {
  await _this.editor.command(helper, item);
  await _this.onSubmitEditor("toolbar");
}

function onSpace(event, editor, next) {
  const { value } = editor;
  const { selection } = value;
  if (selection.isExpanded) return next();

  const { startBlock } = value;
  const { start } = selection;
  const chars = startBlock.text.slice(0, start.offset).replace(/\s*/g, "");
  const type = getType(chars);
  if (!type) return next();
  if (type === "list-item" && startBlock.type === "list-item") return next();
  event.preventDefault();

  editor.setBlocks(type);

  if (type === "list-item") {
    editor.wrapBlock("bulleted-list");
  }

  editor.moveFocusToStartOfNode(startBlock).delete();
}

function onBackspace(event, editor, next) {
  const { value } = editor;
  const { selection } = value;
  if (selection.isExpanded) return next();
  if (selection.start.offset !== 0) return next();

  const { startBlock } = value;
  if (startBlock.type === "paragraph") return next();

  event.preventDefault();
  editor.setBlocks("paragraph");

  if (startBlock.type === "list-item") {
    editor.unwrapBlock("bulleted-list");
  }
}

function onEnter(event, editor, next) {
  const { value } = editor;
  const { selection } = value;
  const { start, end, isExpanded } = selection;
  if (isExpanded) return next();

  const { startBlock } = value;
  if (start.offset === 0 && startBlock.text.length === 0)
    return onBackspace(event, editor, next);
  if (end.offset !== startBlock.text.length) return next();

  if (
    startBlock.type !== "heading-one" &&
    startBlock.type !== "heading-two" &&
    startBlock.type !== "heading-three" &&
    startBlock.type !== "heading-four" &&
    startBlock.type !== "heading-five" &&
    startBlock.type !== "heading-six" &&
    startBlock.type !== "block-quote"
  ) {
    return next();
  }

  event.preventDefault();
  editor.splitBlock().setBlocks("paragraph");
}

function onKeyDown(event, editor, next) {
  let mark;

  if (isBoldHotkey(event)) {
    mark = "bold";
  } else if (isItalicHotkey(event)) {
    mark = "italic";
  } else if (isUnderlinedHotkey(event)) {
    mark = "underlined";
  } else if (isCodeHotkey(event)) {
    mark = "code";
  } else if (event.key) {
    switch (event.key) {
      case "Backspace":
        return onBackspace(event, editor, next);
      case " ":
        return onSpace(event, editor, next);
      case "Enter":
        return onEnter(event, editor, next);
      default:
        return next();
    }
  } else {
    return next();
  }
  event.preventDefault();
  editor.toggleMark(mark);
}

const SlateStaticFunc = {
  renderNode,
  renderMark,
  convertMarkdownSlate,
  wrapLink,
  unwrapLink,
  isImage,
  insertImage,
  schema,
  onKeyDown,
  addToOnchange
};
//slateHelpers
export default SlateStaticFunc;
