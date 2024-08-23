import React from 'react';
import { FilePdfOutlined } from '@ant-design/icons';
import libraryData from '../../../data/libraryData.json';
import { Table } from 'antd';

export default function LibraryComp() {
  const columns = [
    {
      title: 'Seq No.',
      dataIndex: 'id',
      sorter: {
        compare: (a, b) => (a.id > b.id ? 1 : -1),
      },
    },
    {
      title: 'Tune Name',
      dataIndex: 'name',
      sorter: {
        compare: (a, b) => (a.name > b.name ? 1 : -1),
      },
    },
    {
      title: '',
      render: row => (
        <div>
          <a href={`/tunes/${row?.key + '.pdf'}`} download={row?.key + '.pdf'}>
            <FilePdfOutlined className="file-icon-pdf" />
          </a>
        </div>
      ),
    },
  ];
  return (
    <div className="library-main">
      <Table
        columns={columns}
        dataSource={libraryData}
        //   className={`datatable-main ${tableClassName}`}

        //   pagination={tablePagination}
        //   scroll={tableScroll}
        //   footer={() => tableFooter || ''}
        title={() => <h3>Trumpet Tune List</h3>}
      />
    </div>
  );
}
