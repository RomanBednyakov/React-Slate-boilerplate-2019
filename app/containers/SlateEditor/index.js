import React from "react";
import { Editor, getEventRange, getEventTransfer } from "slate-react";
import Prism from "prismjs";
import isUrl from "is-url";
import slateHtmlSerialize from "../../Components/SlateComponents/SlateHtmlSerialize";
import statePrism from "../../Components/SlateComponents/SlatePrism";
import {
  Button,
  Icon,
  Toolbar
} from "../../Components/SlateComponents/slateMenu";
import slateHelpers from "../../Components/SlateComponents/SlateHelpers";
import _ from "lodash";

const DEFAULT_NODE = "paragraph";

statePrism(Prism);

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: slateHtmlSerialize.deserialize(props.value)
    };
    this.lastClickCountEditor = 0;
  }
  componentDidMount() {
    this.onSubmitEditor(0);
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.value !== this.state.value) {
      return true;
    }
    if (nextProps.value !== this.props.value) {
      this.setState({ value: slateHtmlSerialize.deserialize(nextProps.value) });
    }
    return false;
  }

  decorateNode = (node, editor, next) => {
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
        if (startText && startText.key !== undefined) {
          keyStart = startText.key;
        }
        const dec = {
          anchor: {
            key: keyStart,
            offset: startOffset
          },
          focus: {
            key: keyStart,
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
  };

  hasMark = type => {
    const { value } = this.state;
    return value.activeMarks.some(mark => mark.type === type);
  };

  hasBlock = type => {
    const { value } = this.state;
    return value.blocks.some(node => node.type === type);
  };

  hasLinks = () => {
    const { value } = this.state;
    return value.inlines.some(inline => inline.type === "link");
  };

  ref = editor => {
    this.editor = editor;
  };

  renderMarkButton = (type, className) => {
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
  };

  renderBlockButton = (type, className) => {
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
  };

  onClickRedo = event => {
    event.preventDefault();
    this.editor.redo();
  };

  onClickUndo = event => {
    event.preventDefault();
    this.editor.undo();
  };

  onClickImage = event => {
    event.preventDefault();
    const src = window.prompt("Enter the URL of the image:");
    if (!src) return;
    slateHelpers.addToOnchange(this, slateHelpers.insertImage, src);
  };

  onClickMark = (event, type) => {
    event.preventDefault();
    this.editor.toggleMark(type);
  };

  onClickBlock = (event, type) => {
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
  };

  onClickLink = event => {
    event.preventDefault();

    const { editor } = this;
    const { value } = editor;
    const hasLinks = this.hasLinks();

    if (hasLinks) {
      editor.command(slateHelpers.unwrapLink);
    } else if (value.selection.isExpanded) {
      const href = window.prompt("Enter the URL of the link:");

      if (href === null) {
        return;
      }
      slateHelpers.addToOnchange(this, slateHelpers.wrapLink, href);
    } else {
      const href = window.prompt("Enter the URL of the link:");

      if (href === null) {
        return;
      }

      const text = window.prompt("Enter the text for the link:");

      if (text === null) {
        return;
      }
      // noinspection JSAnnotator
      async function asyncFunc(_this) {
        await _this.editor
          .insertText(text)
          .moveFocusBackward(text.length)
          .command(slateHelpers.wrapLink, href);
        await _this.onSubmitEditor("toolbar");
      }
      asyncFunc(this);
    }
  };

  onChange = ({ value }) => {
    this.setState({ value });
  };

  onDropOrPaste = (event, editor, next) => {
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
          editor.command(slateHelpers.insertImage, reader.result, target);
        });

        reader.readAsDataURL(file);
      }
      return;
    }

    if (type === "text") {
      if (!isUrl(text)) return next();
      if (!slateHelpers.isImage(text)) return next();
      editor.command(slateHelpers.insertImage, text, target);
      return;
    }
    next();
  };

  onSubmitEditor = flag => {
    if (flag === "toolbar" || this.lastClickCountEditor === flag) {
      if (flag === 30) {
        this.lastClickCountEditor = 0;
      }
      if (_.isFunction(this.props.onChange)) {
        let content = slateHelpers.convertMarkdownSlate(
          slateHtmlSerialize.serialize(this.state.value),
          true
        );
        const id = this.props.idEditor ? this.props.idEditor : 0;
        this.props.onChange(content, id);
      }
    }
  };

  render() {
    return (
      <div className="editor-slate-block">
        <div onClick={this.onSubmitEditor.bind(this, "toolbar")}>
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
        </div>
        <div
          onKeyDown={() =>
            (this.lastClickCountEditor = this.lastClickCountEditor + 1)
          }
          onKeyUp={_.debounce(
            this.onSubmitEditor.bind(this, this.lastClickCountEditor),
            500
          )}
        >
          <Editor
            spellCheck
            autoFocus
            placeholder="Enter some text..."
            ref={this.ref}
            value={this.state.value}
            onChange={this.onChange}
            schema={slateHelpers.schema}
            onDrop={this.onDropOrPaste}
            onPaste={this.onDropOrPaste}
            decorateNode={this.decorateNode}
            onKeyDown={slateHelpers.onKeyDown}
            renderNode={slateHelpers.renderNode}
            renderMark={slateHelpers.renderMark}
          />
        </div>
      </div>
    );
  }
}

export default Index;
