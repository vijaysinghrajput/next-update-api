'use client'

import React from 'react'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

type DropdownPlacement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'

interface PostOwnerActionMenuProps {
  onEdit: () => void
  onDelete: () => void
  placement?: DropdownPlacement
  buttonClassName?: string
  size?: 'small' | 'middle' | 'large'
}

export function PostOwnerActionMenu({
  onEdit,
  onDelete,
  placement = 'bottomRight',
  buttonClassName,
  size = 'middle',
}: PostOwnerActionMenuProps) {
  const ownerMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit post',
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete post',
      danger: true,
    },
  ]

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'edit') {
      onEdit()
    } else if (key === 'delete') {
      onDelete()
    }
  }

  return (
    <Dropdown
      menu={{
        items: ownerMenuItems,
        onClick: handleClick,
      }}
      trigger={['click']}
      placement={placement}
    >
      <Button
        type='text'
        size={size}
        icon={<MoreOutlined />}
        className={buttonClassName || 'text-gray-400 hover:text-gray-600'}
        onClick={(event) => event.preventDefault()}
      />
    </Dropdown>
  )
}

