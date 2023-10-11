/** @jsxRuntime classic */
/** @jsx jsx */

import { createContext, useContext, useMemo, useState } from 'react';
import { Editor, Element, Node, Transforms, Range, Point } from 'slate';
import { ReactEditor, RenderElementProps, useFocused, useSelected } from 'slate-react';

import { jsx, useTheme } from '@keystone-ui/core';
import { Tooltip } from '@keystone-ui/tooltip';
import { Trash2Icon } from '@keystone-ui/icons/icons/Trash2Icon';
import { ToolIcon } from '@keystone-ui/icons/icons/ToolIcon';
import { ImageIcon } from '@keystone-ui/icons/icons/ImageIcon';

import { useControlledPopover } from '@keystone-ui/popover';
import { DocumentFeatures } from '../views';
import { InlineDialog, ToolbarButton, ToolbarGroup, ToolbarSeparator } from './primitives';
import { paragraphElement } from './paragraphs';
import {
  insertNodesButReplaceIfSelectionIsAtEmptyParagraphOrHeading,
  isElementActive,
  moveChildren,
  useStaticEditor,
} from './utils';
import { useToolbarState } from './toolbar-state';

const BackgroundContext = createContext<{ backgroundType: string, backgroundValue: string }>({ 
  backgroundType: 'color',
  backgroundValue: '#ffffff'
});

export const BackgroundProvider = BackgroundContext.Provider;

export const BackgroundContainer = ({
  attributes,
  children,
  element,
}: RenderElementProps & { element: { type: 'background' } }) => {
  const { spacing } = useTheme();
  const focused = useFocused();
  const selected = useSelected();
  const editor = useStaticEditor();

  const backgroundContext = useContext(BackgroundContext);
  const { dialog, trigger } = useControlledPopover(
    { isOpen: selected, onClose: () => {} },
    { modifiers: [{ name: 'offset', options: { offset: [0, 8] } }] }
  );
  const [ backgroundSettings, setBackgroundSettings ] = useState<{ backgroundType: string, backgroundValue: string }>({ 
    backgroundType: 'color',
    backgroundValue: '#ffffff'
  });
  const [ allowEdit, setAllowEdit ] = useState<boolean>(false);
  const [ backgroundType, setBackgroundType ] = useState<string>(backgroundContext.backgroundType);
  const [ backgroundValue, setBackgroundValue ] = useState<string>(backgroundContext.backgroundValue);

  console.log("This is insider the container")

  return (
    <div css={{
      position: 'relative',
      backgroundColor: backgroundType === 'color' ? backgroundValue : 'transparent',
      backgroundImage: backgroundType === 'image' ? `url(${backgroundValue})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      marginTop: spacing.medium,
      marginBottom: spacing.medium,
    }}
      {...attributes}
    >
      <div
        {...trigger.props}
        ref={trigger.ref}
      >
        {children}
      </div>
      {focused && selected && (
        <InlineDialog ref={dialog.ref} {...dialog.props} css={{ padding: 0, display: 'flex' }}>
          <ToolbarGroup css={{ display: "flex" }}>
            { allowEdit 
              ? (
                <form onSubmit={event => {
                  event.preventDefault();
                  setAllowEdit(false);
                  setBackgroundSettings({ backgroundType, backgroundValue });
                  const path = ReactEditor.findPath(editor, element);
                  Transforms.setNodes(editor, { 
                    type: 'background', 
                    backgroundSettings: { type: backgroundType, value: backgroundValue } 
                  }, { at: path });
                }}>
                  <select onChange={event => {
                    setBackgroundType(event.target.value);
                  }}>
                    <option value="color">Color</option>
                    <option value="image">Image</option>
                  </select>
                  <input type="text" placeholder={ backgroundType == "color"
                    ? "Set Color"
                    : "Set Image Url" } 
                    onChange={event => {
                      setBackgroundValue(event.target.value);
                    }} />
                  <button type="submit">Save</button>
                </form>
              ) : (
                <Tooltip content="Edit Background" weight="subtle">
                  {attrs => (
                    <ToolbarButton
                      variant="action"
                      onMouseDown={event => {
                        event.preventDefault();
                        alert("This will run normal js")
                        setAllowEdit(true);
                      }}
                      {...attrs}
                    >
                      <ToolIcon size="small" />
                    </ToolbarButton>
                  )}
                </Tooltip>
              )} 
          </ToolbarGroup>
          <ToolbarSeparator />
          <Tooltip content="Remove" weight="subtle">
            {attrs => (
              <ToolbarButton
                variant="destructive"
                onMouseDown={event => {
                  event.preventDefault();
                  const path = ReactEditor.findPath(editor, element);
                  Transforms.removeNodes(editor, { at: path });
                }}
                {...attrs}
              >
                <Trash2Icon size="small" />
              </ToolbarButton>
            )}
          </Tooltip>
        </InlineDialog>
      )}
    </div>
  );
};

/*

*/

export const insertBackgroundContainer = ( editor: Editor, backgroundSettings: { type: string, value: string } ) => {
  insertNodesButReplaceIfSelectionIsAtEmptyParagraphOrHeading(editor, [
    {
      type: "background",
      backgroundSettings: { 
        type: 'color',
        value: '#ffffff'
      },
      children: [
        {
          type: "paragraph",
          children: [
            {
              text: ""
            }
          ]
        }
      ]
    }
  ]);

  const backgroundEntry = Editor.above(editor, { match: x => x.type === 'background' });
  if (backgroundEntry) {
    Transforms.select(editor, [...backgroundEntry[1], 0]);
  }
};

export function withBackgrounds(editor: Editor) {
  const { normalizeNode, isVoid } = editor;

  editor.normalizeNode = entry => {
    const [node, path] = entry;

    // If the node is a background and has no children or the children aren't blocks, insert a default block
    if (node.type === 'background') {
      console.log("hit our normalization")
      if (node.children.length === 0 || !Element.isElement(node.children[0])) {
        Transforms.insertNodes(
          editor,
          {
            type: 'paragraph',
            children: [{ text: '' }]
          },
          { at: path.concat([0]) }
        );
        return;
      }
    }

    // If it's not a background, fall back to the original normalizeNode
    normalizeNode(entry);
  };

  return editor;
}

const backgroundIcon = <ImageIcon size="small" />;

export const BackgroundButton = () => {
  console.log("in button")
  const {
    editor,
    background: { isSelected },
  } = useToolbarState();
  return useMemo(
    () => (
      <Tooltip content="Background Settings" weight="subtle">
        {attrs => (
          <ToolbarButton
            isSelected={isSelected}
            onMouseDown={event => {
              event.preventDefault();
              if (isElementActive(editor, 'background')) {
                Transforms.unwrapNodes(editor, {
                  match: node => node.type === 'background',
                });
                return;
              }
              console.log("Hello world")
              insertBackgroundContainer(editor, { type: 'color', value: '#ffffff' });
            }}
            {...attrs}
          >
            {backgroundIcon}
          </ToolbarButton>
        )}
      </Tooltip>
    ),
    [editor, isSelected]
  );
};
