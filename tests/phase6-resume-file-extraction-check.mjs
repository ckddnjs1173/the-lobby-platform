import {
  extractResumeTextFromFile,
} from "../src/lib/server/resumeFileExtractionService.ts";

const PDF_BASE64 =
  "JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgNiAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNCAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDYgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDgxNDA4MjIyNyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDgxNDA4MjIyNyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgMyAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjEyCj4+CnN0cmVhbQpHYXMyQV8kWWNaJjtLWDtgSUZzU2dUYUpsO2NINFM3RHVwVSwjXXJZWSklaVM1QTwxXkAxOkBncHFDWVBATWpGW2RLIic6cTJSXXBlLiFaSiQkQVkwSmo0SlUsZ21OdCY1V1JwWlNuPzZUSWpbPkdSQEc8YyRvMT5vRCVHK20oYHVBK2lPZywvc0ErMlFQKHFkN1RXPEVIP2NhVFZgJkQwOzxjPDctYlsiOipIUlMtYXNGTkZqWGEwXGw4czQ6NFVOOkpoWSNaT1YlQzk+QF81Mmd+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAwOTIgMDAwMDAgbiAKMDAwMDAwMDE5OSAwMDAwMCBuIAowMDAwMDAwNDAyIDAwMDAwIG4gCjAwMDAwMDA0NzAgMDAwMDAgbiAKMDAwMDAwMDczMSAwMDAwMCBuIAowMDAwMDAwNzkwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPGY3NDMzOThlYTkxNzQ2MTlkNGQ5OGUzYWFlYzcxN2UwPjxmNzQzMzk4ZWE5MTc0NjE5ZDRkOThlM2FhZWM3MTdlMD5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNSAwIFIKL1Jvb3QgNCAwIFIKL1NpemUgOAo+PgpzdGFydHhyZWYKMTA5MgolJUVPRgo=";

const DOCX_BASE64 =
  "UEsDBBQAAAAIAMpCDl0XmADX6wAAALIBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU4DMQy98xWRr2gmAweEUKc9sByBQ/kAK/HMRM2mOC3t3+NpoQdUONpvs99itQ9e7aiwS7GHm7YDRdEk6+LYw8f6pbkHxRWjRZ8i9XAghtXyarE+ZGIl4sg9TLXmB63ZTBSQ25QpCjKkErDKWEad0WxwJH3bdXfapFgp1qbOHiBmTzTg1lf1vJf96ZJCnkE9nphzWA+Ys3cGq+B6F+2vmOY7ohXlkcOTy3wtBNCXI2bo74Qf4ZuUU5wl9Y6lvmIQmv5MxWqbzDaItP3f58KlaRicobN+dsslGWKW1oNvz0hAF88f6GPlyy9QSwMEFAAAAAgAykIOXT+t/vqvAAAALAEAAAsAAABfcmVscy8ucmVsc43POw7CMAwA0J1TRN5pWgaEUEMXhNQVlQNEiZtWNB/F4dPbk4EBKgZG/57tunnaid0x0uidgKoogaFTXo/OCLh0p/UOGCXptJy8QwEzEjSHVX3GSaY8Q8MYiGXEkYAhpbDnnNSAVlLhA7pc6X20MuUwGh6kukqDfFOWWx4/DVigrNUCYqsrYN0c8B/c9/2o8OjVzaJLP3YsOrIso8Ek4OGj5vqdLjILPJ/Dv548vABQSwMEFAAAAAgAykIOXVAQRVv1AAAAowEAABEAAAB3b3JkL2RvY3VtZW50LnhtbIVQXUvEMBB891cseW/Tnnoeoe0JeiKCcsj5A9Z0bStNNiTR3v170xP0QeFehtmvmWWq9d6M8Ek+DGxrUeaFALKa28F2tXjZ3WUrASGibXFkS7U4UBDr5qyaVMv6w5CNkBRsUFMt+hidkjLongyGnB3ZNHtjbzCm0ndyYt86z5pCSAZmlIuiWEqDgxVHzVduD0fimgR+htg8oSEFD2gJbpkqOfdm9Ed0f/a3ffpUQVEWWbk4v8gul1er01eb9MWo4D3ZXNMejRsp12xOH96gJ/IKnkmTiylGeESLHXnACJtvJbjnSOP/WoF03HqZuPwJQP7G23wBUEsBAhQDFAAAAAgAykIOXReYANfrAAAAsgEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACADKQg5dP63++q8AAAAsAQAACwAAAAAAAAAAAAAAgAEcAQAAX3JlbHMvLnJlbHNQSwECFAMUAAAACADKQg5dUBBFW/UAAACjAQAAEQAAAAAAAAAAAAAAgAH0AQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAGAMAAAAA";

function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(
    "STEP_1: EXTRACT_TEXT_FILE"
  );

  const textResult =
    await extractResumeTextFromFile(
      new File(
        [
          "Name: Jane Doe\nPhone: 010-1234-5678\nEmail: jane@example.com",
        ],
        "fixture.txt",
        {
          type: "text/plain",
        }
      )
    );

  assert(
    textResult.kind === "TEXT" &&
      textResult.text.includes(
        "jane@example.com"
      ),
    "TEXT_RESUME_EXTRACTION_FAILED"
  );

  console.log(
    "STEP_2: EXTRACT_PDF_FILE"
  );

  const pdfBytes =
    Buffer.from(
      PDF_BASE64,
      "base64"
    );

  const pdfResult =
    await extractResumeTextFromFile(
      new File(
        [pdfBytes],
        "fixture.pdf",
        {
          type: "application/pdf",
        }
      )
    );

  assert(
    pdfResult.kind === "PDF" &&
      pdfResult.text.includes(
        "jane@example.com"
      ),
    `PDF_RESUME_EXTRACTION_FAILED:${pdfResult.text}`
  );

  console.log(
    "STEP_3: EXTRACT_DOCX_FILE"
  );

  const docxBytes =
    Buffer.from(
      DOCX_BASE64,
      "base64"
    );

  const docxResult =
    await extractResumeTextFromFile(
      new File(
        [docxBytes],
        "fixture.docx",
        {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
      )
    );

  assert(
    docxResult.kind === "DOCX" &&
      docxResult.text.includes(
        "jane@example.com"
      ),
    `DOCX_RESUME_EXTRACTION_FAILED:${docxResult.text}`
  );

  console.log(
    "PHASE6_RESUME_FILE_EXTRACTION_CHECK_PASSED"
  );
}

run().catch((error) => {
  console.error(
    "TEST_FAILED:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});
