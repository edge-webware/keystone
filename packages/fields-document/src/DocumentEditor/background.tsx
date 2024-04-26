/** @jsxRuntime classic */
/** @jsx jsx */

import { useMemo, useState, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Editor, Element, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useFocused, useSelected } from 'slate-react';

import { jsx, useTheme } from '@keystone-ui/core';
import { Tooltip } from '@keystone-ui/tooltip';
import { Trash2Icon } from '@keystone-ui/icons/icons/Trash2Icon';
import { ToolIcon } from '@keystone-ui/icons/icons/ToolIcon';
import { ImageIcon } from '@keystone-ui/icons/icons/ImageIcon';

import { useControlledPopover } from '@keystone-ui/popover';
import { InlineDialog, ToolbarButton, ToolbarGroup, ToolbarSeparator } from './primitives';
import {
  insertNodesButReplaceIfSelectionIsAtEmptyParagraphOrHeading,
  isElementActive,
  useStaticEditor,
} from './utils';
import { useToolbarState } from './toolbar-state';
import { useKeystone } from '@keystone-6/core/admin-ui/context';
import { RelationshipSelect } from '@keystone-6/core/fields/types/relationship/views/RelationshipSelect';

export type BackgroundOptions = {
  type: string,
  value: string,
  contrast: string,
  imageSettings: {
    fixed: boolean,
    repeating: boolean,
  } | null,
}

export const BackgroundContainer = ({
  attributes,
  children,
  element,
}: RenderElementProps & { element: { type: 'background' } }) => {
  const { colors, radii, spacing } = useTheme();
  const focused = useFocused();
  const selected = useSelected();
  const editor = useStaticEditor();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { dialog, trigger } = useControlledPopover(
    { isOpen: selected, onClose: () => {} },
    { modifiers: [{ name: 'offset', options: { offset: [0, 2] } }] }
  );
  const defaultBackgroundSettings: BackgroundOptions = { 
    type: 'color',
    value: '#ffffff',
    contrast: 'light',
    imageSettings: {
      fixed: false,
      repeating: false,
    },
  };
  const [ backgroundType, setBackgroundType ] = useState<string>(element.backgroundSettings?.type || defaultBackgroundSettings.type);
  const [ backgroundValue, setBackgroundValue ] = useState<string>(element.backgroundSettings?.value || defaultBackgroundSettings.value);
  const [ backgroundContrast, setBackgroundContrast ] = useState<string>(element.backgroundSettings?.contrast || defaultBackgroundSettings.contrast);
  const [ imageSettings, setImageSettings ] = useState<{ fixed: boolean, repeating: boolean }>(element.backgroundSettings.imageSettings || defaultBackgroundSettings.imageSettings);


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
      border: `2px dashed ${colors.border}`,
      borderRadius: radii.small,
      paddingLeft: spacing.medium,
      paddingRight: spacing.medium,
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
            <Tooltip content="Edit Background" weight="subtle">
              {attrs => (
                <ToolbarButton
                  variant="action"
                  onMouseDown={event => {
                    event.preventDefault();

                    dialogRef.current?.showModal();
                  }}
                  {...attrs}
                >
                  <ToolIcon size="small" />
                </ToolbarButton>
              )}
            </Tooltip>
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
      {
        createPortal(
          <BackgroundSettingsDialog 
            modalRef={dialogRef} 
            editor={editor} 
            element={element}
            backgroundType={backgroundType}
            backgroundValue={backgroundValue}
            backgroundContrast={backgroundContrast}
            imageSettings={imageSettings}
            setBackgroundType={setBackgroundType}
            setBackgroundValue={setBackgroundValue}
            setBackgroundContrast={setBackgroundContrast}
            setImageSettings={setImageSettings}
          />,
          document.body
        )
      }
    </div>
  );
};

const BackgroundSettingsDialog = ({ 
  modalRef, 
  editor, 
  element,
  backgroundType,
  backgroundValue,
  backgroundContrast,
  imageSettings,
  setBackgroundType,
  setBackgroundValue,
  setBackgroundContrast,
  setImageSettings,
}: { 
  modalRef: RefObject<HTMLDialogElement> | null, 
  editor: Editor, 
  element: Element 
  backgroundType: string,
  backgroundValue: string,
  backgroundContrast: string,
  imageSettings: { fixed: boolean, repeating: boolean },
  setBackgroundType: (backgroundType: string) => void,
  setBackgroundValue: (backgroundValue: string) => void,
  setBackgroundContrast: (backgroundContrast: string) => void
  setImageSettings: (imageSettings: { fixed: boolean, repeating: boolean }) => void
}) => {
  const keystone = useKeystone();
  const list = keystone.adminMeta.lists["Image"];
  let searchFields: string[] = [];
  if ( list ) {
    searchFields = Object.keys(list.fields).filter(key => list.fields[key].search);
  }
  const handleTypeChange = (value: string) => {
    setBackgroundValue('');
    setBackgroundType(value);
  }

  return (
    <dialog ref={modalRef}
      css={{
        width: '100%',
        maxWidth: 400,
        height: "12rem",
        overflow: "scroll"
      }}
    >
      <form onSubmit={event => {
        event.preventDefault();
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(editor, { 
          type: 'background', 
          backgroundSettings: { type: backgroundType, value: backgroundValue, contrast: backgroundContrast, imageSettings: imageSettings } 
        }, { at: path });
        modalRef?.current?.close();
      }}
        css={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div>
          <select value={backgroundType} onChange={(event) => {
            handleTypeChange(event.target.value);
          }}
            css={{
              marginRight: 8,
            }}
          >
            <option value="color">Color</option>
            <option value="image">Image</option>
          </select>
          <select value={backgroundContrast} onChange={(event) => {
            if (event.target.value === "image") {
              setImageSettings({
                fixed: imageSettings?.fixed || false,
                repeating: imageSettings?.repeating || false,
              })
            }

            setBackgroundContrast(event.target.value);
          }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          {
            backgroundType === "image" && (
              <label css={{
                marginLeft: 8,
                marginRight: 8,
              }}>
                <input type="checkbox" checked={imageSettings?.fixed} onChange={(event) => {
                  setImageSettings({
                    repeating: imageSettings?.repeating || false,
                    fixed: event.target.checked,
                  })
                }} />
                Fixed
              </label>
            )
          }
          {
            backgroundType === "image" && (
              <label css={{
                marginLeft: 8,
                marginRight: 8,
              }}>
                <input type="checkbox" checked={imageSettings?.repeating} onChange={(event) => {
                  setImageSettings({
                    fixed: imageSettings?.fixed || false,
                    repeating: event.target.checked,
                  })
                }} />
                Repeat Background 
              </label>
            )
          }
        </div>
        {backgroundType === "image" && list ? (
          <div css={{
            marginTop: 8,
            marginBottom: 8,
            zIndex: 1000,
          }}>
            <RelationshipSelect
              controlShouldRenderValue
              isDisabled={false}
              list={list}
              labelField={list.labelField}
              searchFields={searchFields}
              state={{
                kind: 'one',
                value: handleSelectValueOrNull(backgroundValue), 
                onChange(value) {
                  setBackgroundValue(JSON.stringify(value))
                },
              }}
            />
          </div>
        ) : (
            <input 
              type="text" 
              autoFocus 
              placeholder={ backgroundType == "color"
                ? "Set Color"
                : "Set Image Url" } 
              value={backgroundValue}
              onChange={(event) => {
                setBackgroundValue(event.target.value);
              }}
              css={{
                marginTop: 8,
                marginBottom: 8,
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
              }}
            />
        )}
        <button type="submit">Save</button>
      </form>
    </dialog>
  );
}

export const insertBackgroundContainer = ( editor: Editor, backgroundSettings: { type: string, value: string } ) => {
  insertNodesButReplaceIfSelectionIsAtEmptyParagraphOrHeading(editor, [
    {
      type: "background",
      backgroundSettings: { 
        type: 'color',
        value: '#ffffff',
        contrast: 'light',
        imageSettings: {
          fixed: false,
          repeating: false,
        }, 
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
  const { normalizeNode } = editor;

  editor.normalizeNode = entry => {
    const [node, path] = entry;

    // If the node is a background and has no children or the children aren't blocks, insert a default block
    if (node.type === 'background') {
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

/*
 * UTILS
 */
const handleSelectValueOrNull = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}
