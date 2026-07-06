import { Box, Flex, Heading, Image, Text } from '@chakra-ui/react';

import { ReadOnlyField, ReadOnlyTextOrNumber } from '../../ReadOnlyInputs';

import { EcfTable } from './EcfTable';

interface EcfCartesianVectorsFormatTabProps {
  ecf_cartesian_vectors_format_file: string;
  ecf_cartesian_vectors_format_file_desc: string;
  ground_track_of_launch_vehicle_2d_img_file: string;
  ground_track_of_launch_vehicle_2d_img_file_desc: string;
  ground_track_from_liftoff_until_payload_separation: string;
}

export const EcfCartesianVectorsFormatTab = ({
  ecf_cartesian_vectors_format_file,
  ecf_cartesian_vectors_format_file_desc,
  ground_track_of_launch_vehicle_2d_img_file,
  ground_track_of_launch_vehicle_2d_img_file_desc,
  ground_track_from_liftoff_until_payload_separation,
}: EcfCartesianVectorsFormatTabProps) => {
  return (
    <Flex flexDir="column" gap={5}>
      <Box my={4}>
        <Heading size="md" mb={7}>
          ECF Cartesian Vectors Format
        </Heading>

        <EcfTable base64ExcelFile={ecf_cartesian_vectors_format_file} />
        <Text textAlign="center" mt={5} mb={10}>
          {ecf_cartesian_vectors_format_file_desc}
        </Text>
      </Box>

      <Box>
        <Heading size="md" mb={7}>
          Ground Track
        </Heading>
        {ground_track_of_launch_vehicle_2d_img_file && (
          <Box mb={7}>
            <Image
              src={ground_track_of_launch_vehicle_2d_img_file}
              alt="Ground path of the launch vehicle displayed in 2D"
              w="100%"
              m="0px auto"
            />
            <Text mt={5} mb={10} textAlign="center">
              {ground_track_of_launch_vehicle_2d_img_file_desc}
            </Text>
          </Box>
        )}
        <Box>
          <ReadOnlyField
            label="Ground Track from Lift Off until Payload Separation"
            htmlFor="ground_track_from_liftoff_until_payload_separation"
          >
            <ReadOnlyTextOrNumber
              id="ground_track_from_liftoff_until_payload_separation"
              inputType="textarea"
              value={ground_track_from_liftoff_until_payload_separation}
            />
          </ReadOnlyField>
        </Box>
      </Box>
    </Flex>
  );
};
