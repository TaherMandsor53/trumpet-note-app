import React, { useState } from 'react';
import { Button, Form, Input, Select, Modal } from 'antd';
import ConvertNotesData from '../../../data/convertData.json';
import sampleNoteImg from '../../../assets/images/sampleImg.png';
import jsPDF from 'jspdf';

export default function ConvertNotesComp() {
  const [finalConversion, setFinalConversion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = val => {
    if (val?.baseType === 1) {
      let placeholder = ' __NEWLINE__ ';
      let strWithPlaceholder = val?.notations?.replace(/\n/g, placeholder);
      let semitoneValue = strWithPlaceholder
        ?.split(' ')
        ?.map(_ => {
          console.log({ _ });
          return ConvertNotesData?.higherNotesMap[_] || placeholder;
        })
        ?.join('_');

      let finalStr = semitoneValue
        .replace(/ /g, placeholder)
        .replace(new RegExp(placeholder, 'g'), '\n')
        .replace(/__NEWLINE__/g, ' ')
        ?.replace(/_/g, ' ');
      setFinalConversion(finalStr);
      setIsModalOpen(true);
      setLoading(true);
    }
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const onModalClose = () => {
    setIsModalOpen(false);
    setLoading(false);
  };

  const onModalOk = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(finalConversion, 10, 10);

    doc.save('convertedNotes.pdf');
  };

  return (
    <div className="usergroup-tab-main">
      <Form
        name="convert_notes_details"
        className="convert-notes-form"
        onFinish={onFinish}
        layout="vertical"
        autoComplete="off"
        form={form}
      >
        <Form.Item
          name="noteType"
          label="Note Type"
          className="username-label"
          rules={[
            {
              required: true,
              message: 'Please select note type!',
            },
          ]}
        >
          <Select>
            {ConvertNotesData?.noteType?.map(_ => {
              return <Select.Option value={_?.id}>{_?.name}</Select.Option>;
            })}
          </Select>
        </Form.Item>

        <Form.Item
          name="instrumentType"
          label="Instrument Type"
          rules={[
            {
              required: true,
              message: 'Please select instrument type!',
            },
          ]}
          className="roleId-label"
        >
          <Select>
            {ConvertNotesData?.instrumentTypes?.map(_ => {
              return <Select.Option value={_?.id}>{_?.name}</Select.Option>;
            })}
          </Select>
        </Form.Item>

        <Form.Item
          name="baseType"
          label="Sound Base Type"
          rules={[
            {
              required: true,
              message: 'Please select base type!',
            },
          ]}
          className="roleId-label"
        >
          <Select>
            {ConvertNotesData?.soundBaseType?.map(_ => {
              return <Select.Option value={_?.id}>{_?.name}</Select.Option>;
            })}
          </Select>
        </Form.Item>

        <Form.Item
          name="notations"
          label="Notations"
          rules={[
            {
              required: true,
              message: 'Please enter notation!',
            },
          ]}
          className="description-label"
        >
          <Input.TextArea rows={6} />
        </Form.Item>

        <div>
          <img src={sampleNoteImg} alt="sample_img" width={'320px'} />
        </div>

        <Form.Item>
          <div className="convert-btn-wrapper">
            <Button type="primary" htmlType="submit" className="save-form-button">
              Submit
            </Button>
            <Button htmlType="reset" className="save-form-button">
              Reset
            </Button>
          </div>
        </Form.Item>
      </Form>
      <Modal
        title="Download"
        loading={loading}
        open={isModalOpen}
        onCancel={onModalClose}
        onOk={onModalOk}
        okText="Download Notes"
      >
        Notations converted successfully...! <br />
        You can download it by clicking on Download button.
        <br />
        <br />
      </Modal>
    </div>
  );
}
