import React from 'react';
import { YoutubeOutlined } from '@ant-design/icons';
import videosData from '../../../data/videosData.json';
import { Table } from 'antd';

export default function VideosComp() {
  const redirectToYouTube = videoUrl => {
    // Redirect to the YouTube URL in a new tab
    window.open(videoUrl, '_blank');
  };
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
          {/* <ReactPlayer
            url="https://www.youtube.com/watch?v=QM1UC7O0sWI&list=RDQM1UC7O0sWI"
            controls
           
          > */}
          <YoutubeOutlined className="file-icon-pdf youtube" onClick={() => redirectToYouTube(row?.url)} />
          {/* </ReactPlayer> */}

          {/* <Player
            autoPlay
            poster="/assets/images/tsgCoverImg.png"
            src="https://www.youtube.com/watch?v=QM1UC7O0sWI&list=RDQM1UC7O0sWI"
          ></Player> */}
        </div>
      ),
    },
  ];
  return (
    <div className="library-main">
      <Table
        columns={columns}
        dataSource={videosData}
        //   className={`datatable-main ${tableClassName}`}

        //   pagination={tablePagination}
        //   scroll={tableScroll}
        //   footer={() => tableFooter || ''}
        title={() => <h3>Trumpet Tune Videos</h3>}
      />
    </div>
  );
}
