import React from "react";
import Html from "slate-html-serializer";
import styled from "react-emotion";

const BLOCK_TAGS = {
  p: "paragraph",
  li: "list-item",
  ul: "bulleted-list",
  ol: "numbered-list",
  blockquote: "quote",
  pre: "code",
  h1: "heading-one",
  h2: "heading-two",
  h3: "heading-three",
  h4: "heading-four",
  h5: "heading-five",
  h6: "heading-six",
  center: "center",
  img: "image",
  a: "link"
};

const MARK_TAGS = {
  strong: "bold",
  em: "italic",
  u: "underlined",
  s: "strikethrough",
  code: "code"
};
const Image = styled("img")`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? "0 0 0 2px blue;" : "none")};
`;

const RULES = [
  {
    deserialize(el, next) {
      const block = BLOCK_TAGS[el.tagName.toLowerCase()];
      if (el.tagName.toLowerCase() === "pre") {
        const code = el.childNodes[0];
        const childNodes =
          code && code.tagName.toLowerCase() === "code"
            ? code.childNodes
            : el.childNodes;

        return {
          object: "block",
          type: "code",
          nodes: next(childNodes)
        };
      }
      if (el.tagName.toLowerCase() === "img") {
        return {
          object: "block",
          type: "image",
          nodes: next(el.childNodes),
          data: {
            src: el.getAttribute("src")
          }
        };
      }
      if (el.tagName.toLowerCase() === "blockquote") {
        return {
          object: "block",
          type: "blockquote",
          nodes: next(el.childNodes)
        };
      }
      if (el.tagName.toLowerCase() === "a") {
        return {
          object: "inline",
          type: "link",
          nodes: next(el.childNodes),
          data: {
            href: el.getAttribute("href")
          }
        };
      }
      if (block) {
        return {
          object: "block",
          type: block,
          nodes: next(el.childNodes)
        };
      }
    },
    serialize(obj, children) {
      if (obj.object === "block") {
        switch (obj.type) {
          case "code":
            return (
              <pre>
                <code>{children}</code>
              </pre>
            );
          case "paragraph":
            return <p className={obj.data.get("className")}>{children}</p>;
          case "heading-one":
            return <h1>{children}</h1>;
          case "heading-two":
            return <h2>{children}</h2>;
          case "list-item":
            return <li>{children}</li>;
          case "bulleted-list":
            return <ul>{children}</ul>;
          case "numbered-list":
            return <ol>{children}</ol>;
          case "center":
            return <center>{children}</center>;
          case "block-quote":
            return <blockquote>{children}</blockquote>;
          case "image":
            return <Image src={obj.data.get("src")} />;
          case "quote":
            return <blockquote>{children}</blockquote>;
          case "link":
            return <a href={obj.data.get("href")}>{children}</a>;
        }
      }
      if (obj.object === "inline") {
        switch (obj.type) {
          case "link":
            return <a href={obj.data.get("href")}>{children}</a>;
        }
      }
    }
  },
  {
    deserialize(el, next) {
      const mark = MARK_TAGS[el.tagName.toLowerCase()];

      if (mark) {
        return {
          object: "mark",
          type: mark,
          nodes: next(el.childNodes)
        };
      }
    },
    serialize(obj, children) {
      if (obj.object === "mark") {
        switch (obj.type) {
          case "bold":
            return <strong>{children}</strong>;
          case "italic":
            return <em>{children}</em>;
          case "strikethrough":
            return <strike>{children}</strike>;
          case "code":
            return <code>{children}</code>;
          case "underlined":
            return <u>{children}</u>;
        }
      }
    }
  }
];

const serializer = new Html({ rules: RULES });
export default serializer;
