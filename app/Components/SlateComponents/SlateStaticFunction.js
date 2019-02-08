import React from "react";
import styled from "react-emotion";
import { isKeyHotkey } from "is-hotkey";

const Image = styled("img")`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? "0 0 0 2px blue;" : "none")};
`;
const isBoldHotkey = isKeyHotkey("mod+b");
const isItalicHotkey = isKeyHotkey("mod+i");
const isUnderlinedHotkey = isKeyHotkey("mod+u");
const isCodeHotkey = isKeyHotkey("mod+`");

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
  } else {
    return next();
  }

  event.preventDefault();
  editor.toggleMark(mark);
}
const SlateStaticFunc = { renderNode, renderMark, onKeyDown };
export default SlateStaticFunc;
