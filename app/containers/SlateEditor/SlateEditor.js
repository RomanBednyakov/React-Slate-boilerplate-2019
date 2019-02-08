import React from "react";
import { Editor, getEventRange, getEventTransfer } from "slate-react";
import { Block } from "slate";
import Prism from "prismjs";
import isUrl from "is-url";
import imageExtensions from "image-extensions";
import slateHtmlSerialize from "../../Components/SlateComponents/SlateHtmlSerialize";
import statePrism from "../../Components/SlateComponents/SlatePrism";
import {
  Button,
  Icon,
  Toolbar
} from "../../Components/SlateComponents/slateMenu";
import slateStaticFunc from "../../Components/SlateComponents/SlateStaticFunction";

const DEFAULT_NODE = "paragraph";

statePrism(Prism);

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

const schema = {
  document: {
    last: { type: "paragraph" },
    normalize: (editor, { code, node, child }) => {
      switch (code) {
        case "last_child_type_invalid": {
          const paragraph = Block.create("paragraph");
          return editor.insertNodeByKey(node.key, node.nodes.size, paragraph);
        }
      }
    }
  },
  blocks: {
    image: {
      isVoid: true
    }
  }
};

class SlateEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: slateHtmlSerialize.deserialize(props.value)
    };
    this.hasMark = this.hasMark.bind(this);
    this.hasBlock = this.hasBlock.bind(this);
    this.ref = this.ref.bind(this);
    this.decorateNode = this.decorateNode.bind(this);
    this.renderMarkButton = this.renderMarkButton.bind(this);
    this.renderBlockButton = this.renderBlockButton.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onClickMark = this.onClickMark.bind(this);
    this.onClickBlock = this.onClickBlock.bind(this);
    this.onClickUndo = this.onClickUndo.bind(this);
    this.onClickRedo = this.onClickRedo.bind(this);
    this.onClickImage = this.onClickImage.bind(this);
    this.hasLinks = this.hasLinks.bind(this);
    this.onDropOrPaste = this.onDropOrPaste.bind(this);
    this.onClickLink = this.onClickLink.bind(this);
    this.myRef = React.createRef();
  }

  hasMark(type) {
    const { value } = this.state;
    return value.activeMarks.some(mark => mark.type === type);
  }

  hasBlock(type) {
    const { value } = this.state;
    return value.blocks.some(node => node.type === type);
  }

  hasLinks() {
    const { value } = this.state;
    return value.inlines.some(inline => inline.type === "link");
  }

  ref(editor) {
    this.editor = editor;
  }

  decorateNode(node, editor, next) {
    const others = next() || [];
    if (node.object !== "block") return others;

    const string = node.text;
    const texts = node.getTexts().toArray();
    const grammar = Prism.languages.markdown;
    const tokens = Prism.tokenize(string, grammar);
    const decorations = [];
    let startText = texts.shift();
    let endText = startText;
    let startOffset = 0;
    let endOffset = 0;
    let start = 0;

    function getLength(token) {
      if (typeof token === "string") {
        return token.length;
      } else if (typeof token.content === "string") {
        return token.content.length;
      } else {
        return token.content.reduce((l, t) => l + getLength(t), 0);
      }
    }

    for (const token of tokens) {
      startText = endText;
      startOffset = endOffset;

      const length = getLength(token);
      const end = start + length;
      let available = startOffset;

      if (startText) {
        available = startText.text.length - startOffset;
      }
      let remaining = length;

      endOffset = startOffset + remaining;

      while (available < remaining) {
        endText = texts.shift();
        remaining = length - available;
        available = remaining;

        if (endText) {
          available = endText.text.length;
        }
        endOffset = remaining;
      }

      if (typeof token !== "string") {
        let keyStart = 10;
        let keyEnd = 10;
        if (startText) {
          keyStart = startText.key;
        }
        if (endText) {
          keyEnd = endText.key;
        }

        const dec = {
          anchor: {
            key: keyStart,
            offset: startOffset
          },
          focus: {
            key: keyEnd,
            offset: endOffset
          },
          mark: {
            type: token.type
          }
        };

        decorations.push(dec);
      }

      start = end;
    }

    return [...others, ...decorations];
  }

  renderMarkButton(type, className) {
    const isActive = this.hasMark(type);

    return (
      <Button
        active={isActive}
        onMouseDown={event => this.onClickMark(event, type)}
      >
        <Icon>
          <span className={className} />
        </Icon>
      </Button>
    );
  }

  renderBlockButton(type, className) {
    let isActive = this.hasBlock(type);

    if (["numbered-list", "bulleted-list"].includes(type)) {
      const {
        value: { document, blocks }
      } = this.state;

      if (blocks.size > 0) {
        const parent = document.getParent(blocks.first().key);
        isActive = this.hasBlock("list-item") && parent && parent.type === type;
      }
    }

    return (
      <Button
        active={isActive}
        onMouseDown={event => this.onClickBlock(event, type)}
      >
        <Icon>
          <span className={className} />
        </Icon>
      </Button>
    );
  }

  onClickRedo(event) {
    event.preventDefault();
    this.editor.redo();
  }

  onClickUndo(event) {
    event.preventDefault();
    this.editor.undo();
  }

  onClickImage(event) {
    event.preventDefault();
    const src = window.prompt("Enter the URL of the image:");
    if (!src) return;
    this.editor.command(insertImage, src);
  }

  onClickMark(event, type) {
    event.preventDefault();
    this.editor.toggleMark(type);
  }

  onClickBlock(event, type) {
    event.preventDefault();

    const { editor } = this;
    const { value } = editor;
    const { document } = value;

    // Handle everything but list buttons.
    if (type !== "bulleted-list" && type !== "numbered-list") {
      const isActive = this.hasBlock(type);
      const isList = this.hasBlock("list-item");

      if (isList) {
        editor
          .setBlocks(isActive ? DEFAULT_NODE : type)
          .unwrapBlock("bulleted-list")
          .unwrapBlock("numbered-list");
      } else {
        editor.setBlocks(isActive ? DEFAULT_NODE : type);
      }
    } else {
      // Handle the extra wrapping required for list buttons.
      const isList = this.hasBlock("list-item");
      const isType = value.blocks.some(block => {
        return !!document.getClosest(block.key, parent => parent.type === type);
      });

      if (isList && isType) {
        editor
          .setBlocks(DEFAULT_NODE)
          .unwrapBlock("bulleted-list")
          .unwrapBlock("numbered-list");
      } else if (isList) {
        editor
          .unwrapBlock(
            type === "bulleted-list" ? "numbered-list" : "bulleted-list"
          )
          .wrapBlock(type);
      } else {
        editor.setBlocks("list-item").wrapBlock(type);
      }
    }
  }

  onChange({ value }) {
    this.setState({ value });
    this.props.onChange(this.myRef.current.children[0].innerHTML);
  }

  onClickLink(event) {
    event.preventDefault();

    const { editor } = this;
    const { value } = editor;
    const hasLinks = this.hasLinks();

    if (hasLinks) {
      editor.command(unwrapLink);
    } else if (value.selection.isExpanded) {
      const href = window.prompt("Enter the URL of the link:");

      if (href === null) {
        return;
      }

      editor.command(wrapLink, href);
    } else {
      const href = window.prompt("Enter the URL of the link:");

      if (href === null) {
        return;
      }

      const text = window.prompt("Enter the text for the link:");

      if (text === null) {
        return;
      }

      editor
        .insertText(text)
        .moveFocusBackward(text.length)
        .command(wrapLink, href);
    }
  }

  onDropOrPaste(event, editor, next) {
    const target = getEventRange(event, editor);
    if (!target && event.type === "drop") return next();

    const transfer = getEventTransfer(event);
    const { type, text, files } = transfer;

    if (type === "files") {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split("/");
        if (mime !== "image") continue;

        reader.addEventListener("load", () => {
          editor.command(insertImage, reader.result, target);
        });

        reader.readAsDataURL(file);
      }
      return;
    }

    if (type === "text") {
      if (!isUrl(text)) return next();
      if (!isImage(text)) return next();
      editor.command(insertImage, text, target);
      return;
    }
    next();
  }

  render() {
    return (
      <div>
        <Toolbar>
          {this.renderMarkButton("strikethrough", "fa fa-strikethrough")}
          {this.renderMarkButton("bold", "fa fa-bold")}
          {this.renderMarkButton("italic", "fa fa-italic")}
          {this.renderMarkButton("underlined", "fa fa-underline")}
          {this.renderMarkButton("code", "fa fa-code")}
          {this.renderBlockButton(
            "heading-one",
            "fa fa-header fa-header-x fa-header-smaller"
          )}
          {this.renderBlockButton(
            "heading-two",
            "fa fa-header fa-header-x fa-header-bigger"
          )}
          {this.renderBlockButton("block-quote", "fa fa-quote-left")}
          {this.renderBlockButton("numbered-list", "fa fa-list-ol")}
          {this.renderBlockButton("bulleted-list", "fa fa-list-ul")}
          <Button onMouseDown={this.onClickImage}>
            <Icon>
              <span className="fa fa-image" />
            </Icon>
          </Button>
          <Button active={this.hasLinks()} onMouseDown={this.onClickLink}>
            <Icon>
              <span className="fa fa-link" />
            </Icon>
          </Button>
          <Button onMouseDown={this.onClickUndo}>
            <Icon>
              <span className="fa fa-undo" />
            </Icon>
          </Button>
          <Button onMouseDown={this.onClickRedo}>
            <Icon>
              <span className="fa fa-repeat" />
            </Icon>
          </Button>
        </Toolbar>
        <div ref={this.myRef}>
          <Editor
            spellCheck
            autoFocus
            placeholder="Enter some text..."
            ref={this.ref}
            value={this.state.value}
            onChange={this.onChange}
            schema={schema}
            onDrop={this.onDropOrPaste}
            onPaste={this.onDropOrPaste}
            onKeyDown={slateStaticFunc.onKeyDown}
            decorateNode={this.decorateNode}
            renderNode={slateStaticFunc.renderNode}
            renderMark={slateStaticFunc.renderMark}
          />
        </div>
      </div>
    );
  }
}

export default SlateEditor;
