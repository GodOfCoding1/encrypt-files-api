import { uploadImage } from "../helpers/cloudinary.js";
import {
  decryptImageBuffer,
  encryptImageBuffer,
} from "../helpers/encryption.js";
import Image from "../models/image.js";
import * as fs from "fs";

export const getAllImages = async (req, res, next) => {
  try {
    const images = await Image.find();

    return res.status(200).json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Error Getting Images: ${error.message}`,
    });
  }
};

export const getImageById = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: "image Not Found",
      });
    }
    return res.status(200).json({
      success: true,
      data: image,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Error Getting image ${req.params.id}: ${error.message}`,
    });
  }
};

export const addImage = async (req, res, next) => {
  try {
    if (!req.file) throw new Error("no file attached");
    const encryptedInfo = encryptImageBuffer(req.file.buffer);

    fs.writeFileSync("i1.jpeg", encryptedInfo.buffer);
    fs.writeFileSync("key.txt", encryptedInfo.encryptedHash);
    const result = await uploadImage(encryptedInfo.buffer);
    await Image.create({
      asset_id: result.asset_id,
      url: result.secure_url,
      hash: encryptedInfo.encryptedHash,
    });

    return res.status(201).json({
      success: true,
      data: { url: result.secure_url },
    });
  } catch (error) {
    console.log(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map((val) => val.message),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: `Error Adding image: ${error.message}`,
      });
    }
  }
};

export const deleteImageById = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: "Image Not Found",
      });
    }

    await image.remove();

    return res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Error Deleting Image: ${error.message}`,
    });
  }
};

export const getNumberOfImages = async (req, res, next) => {
  try {
    const count = await Image.count();
    return res.status(201).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: `Error counting: ${error.message}`,
    });
  }
};

export const getImageIds = async (req, res, next) => {
  try {
    const ids = (await Image.find({}, ["_id"])).map((v) => v._id);
    return res.status(201).json({
      success: true,
      data: { ids },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: `Error getting ids: ${error.message}`,
    });
  }
};

export const getDecodedImageById = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);
    const imageBufferRes = await fetch(image.url);
    const imageBuffer = await decryptImageBuffer(
      Buffer.from(await imageBufferRes.arrayBuffer()),
      image.hash,
      req.params.password
    );
    const fileName = req.params.id + ".jpeg";
    res.writeHead(200, {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "image/jpeg",
    });
    return res.end(imageBuffer);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: `Error decoding: ${error.message}`,
    });
  }
};
