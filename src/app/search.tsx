"use client";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import axios from "axios";
import { useEffect, useState } from "react";
import React from "react";
import toast, { Toaster } from 'react-hot-toast';
import { setDefaultHighWaterMark } from "stream";



let timer: NodeJS.Timeout | null = null;

const HEADERS = ["vector_id", "score", "title", "vector_text"];
// Note: Load CSV file are hidden when deployed on Vercel.
const SUPPORT_IMPORT =
  process.env.NEXT_PUBLIC_SUPPORT_IMPORT?.toLocaleLowerCase() === "true";

export default function SearchPage() {
  // Define state variables
  const [value, setValue] = useState("");
  const [data, setData] = useState<{ [x in string]: string }[]>([]);
  const [loading, setLoading] = useState({
    search: false,
    insertCsv: false,
    insert: false,
    page: true,
  });
  const [insertProgress, setInsertProgress] = useState(0);
  const [form, setForm] = useState<{ title: string; vector_text: string }>({
    title: "",
    vector_text: "",
  });
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [dbBuilt, setdbBuilt] = useState(false);
  const [dbHasContent, setDbHasContent] = useState(false);
  const notify = () => toast('Vector database already created');

  const handleBuildDatabase = async () => {
    const hasContent = (await axios.get("/api/milvus/loadEmbeddings/progress")).data.content;
    console.log(`has content: ${hasContent}`)
    setDbHasContent(hasContent);
    if (dbHasContent) {
      notify();
    } else {
      loadCsv();
    }
  };

  const getLoadEmbeddingsProgress = async () => {
    const data = (await axios.get("/api/milvus/loadEmbeddings/progress")).data;
    const progress = data.progress;
    const isInserting = data.isInserting;
    const errorMsg = data.errorMsg;

    // If there is an error message, alert the user and stop loading
    if (errorMsg) {
      window.alert(errorMsg);
      setLoading((v) => ({
        ...v,
        insertCsv: false,
      }));
      setInsertProgress(0);
      return;
    }

    // Update the progress state
    setInsertProgress(progress);
    console.log(progress)
    // Update the loading state based on whether data is still being inserted
    setLoading((v) => ({
      ...v,
      insertCsv: isInserting,
    }));
    // If progress is not complete or data is still being inserted, continue checking progress every second
    if ((progress < 100 && progress > 0) || isInserting) {
      timer = setTimeout(getLoadEmbeddingsProgress, 1000);
    }

    // If progress is complete, stop loading and clear the timer
    if (progress === 100) {
      setLoading((v) => ({
        ...v,
        insertCsv: false,
      }));
      timer && clearTimeout(timer);
      timer = null;
    }
  };
  // Function to load CSV data
  const loadCsv = async () => {
    try {
      setLoading((v) => ({
        ...v,
        insertCsv: true,
      }));
      await axios.get(`/api/milvus/loadEmbeddings`);
      setTimeout(() => {
        getLoadEmbeddingsProgress();
      }, 1000);
      setdbBuilt(true);
    } catch (e) {
      window.alert(`Load Embeddings folder failed:${e}`);
      setLoading((v) => ({
        ...v,
        insertCsv: false,
      }));
    }
  };

  // Function to perform search
  const search = async (text: string) => {
    try {
      setLoading((v) => ({
        ...v,
        search: true,
      }));
      const res = await axios.post(`/api/milvus/search`, { text });
      console.log("searching")
      setData(res.data?.results || []);
    } finally {
      setLoading((v) => ({
        ...v,
        search: false,
      }));
    }
  };

  const downloadJSON = (searchValue: string) => {
    const jsonData = data.map((item) => {
      const transformedItem: { [key: string]: string | number } = {};
      HEADERS.forEach((header) => {
        transformedItem[header] = item[header];
      });
      return transformedItem;
    });

    const jsonString = JSON.stringify({ searchQuery: searchValue, results: jsonData }, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `results_for_query:${searchValue}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // Upon component mounting, initialize Milvus and load CSV data for utilization as random queries
  useEffect(() => {
    const init = async () => {
      try {
        setLoading((v) => ({ ...v, page: true }));
      } catch (error) {
        window.alert("Init Milvus and create collection failed, please check your env.");
      } finally {
        setLoading((v) => ({ ...v, page: false }));
      }
    };

    init();
  }, []);

  return (
    <main className="container mx-auto">
      <div className="flex justify-between mt-4">
        <a target="_blank" href="https://zilliz.com">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="logo" className="w-16 h-16 rounded-full object-cover" />
        </a>
        <Toaster />
        <div className="flex gap-2">
          {/* Note: API requests may timeout on Vercel's free plan as it has a maximum timeout limit of 10 seconds*/}
          {SUPPORT_IMPORT && (
            <>
              <Button
                onClick={handleBuildDatabase}
                isLoading={loading.insertCsv}
                isDisabled={loading.page}
                style={{
                  opacity: 0, // Make it invisible if not admin
                  pointerEvents: 'auto', // Allow clicks only if admin
                }}
              >
                {loading.insertCsv
                  ? `Embedding and inserting ...`
                  : "admin - don't press"}
              </Button>
              <Button onClick={() => downloadJSON(value)} variant="faded" disabled={data.length === 0}>
                Download JSON Results
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-40">
        {/* Input field for the user to enter text to search */}
        <Input
          value={value}
          placeholder="Enter your text to search"
          className="full-width"
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex gap-6 justify-between">
          {/* Button to ask a random question 
          <Button
            color="secondary"
            size="lg"
            className="center "
            fullWidth
            onClick={searchByRandom}
            isLoading={loading.search}
          >
            Ask Random Question
          </Button>
           Button to perform the search */}
          <Button
            onClick={() => {
              search(value);
            }}
            color="primary"
            size="lg"
            className="center"
            fullWidth
            isLoading={loading.search}
          >
            Ask
          </Button>
        </div>
      </div>
      {/* Display the answer to the first question */}
      <p className="mt-10 font-bold text-lg text-center">{data[0]?.vector_text}</p>
      {/* Table to display the search results */}
      <Table aria-label="Search result table " className="mt-10 mb-10">
        <TableHeader>
          {HEADERS.map((header) => (
            <TableColumn key={header}>{header.toLocaleUpperCase()}</TableColumn>
          ))}
        </TableHeader>

        <TableBody>
          {data.map((row, index) => {
            return (
              <TableRow key={index}>
                {HEADERS.map((header) => (
                  <TableCell key={header}>{row[header]}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Modal for inserting data */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Modal Title
              </ModalHeader>
              <ModalBody>
                {/* Input field for the question */}
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, title: e.target.value }))
                  }
                  label="Title"
                  placeholder="Enter your title"
                />
                {/* Input field for the answer */}
                <Input
                  value={form.vector_text}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, vector_text: e.target.value }))
                  }
                  label="Text"
                  placeholder="Enter your text"
                />
              </ModalBody>
              <ModalFooter>
                {/* Button to close the modal */}
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                {/* Button to insert the data */}
                {/* <Button
                  color="primary"
                  onPress={handleInsert}
                  isLoading={loading.insert}
                >
                  Insert
                </Button> */}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
